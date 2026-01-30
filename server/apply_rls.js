import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new pg.Pool({
    connectionString,
    // ssl: { rejectUnauthorized: false } // Disabled for internal connection
});


const MIGRATION_SQL = `
-- 1. Enable RLS on Tables
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Owner access" ON instances;
DROP POLICY IF EXISTS "Owner access" ON contacts;
DROP POLICY IF EXISTS "Owner access" ON conversations;
DROP POLICY IF EXISTS "Owner access" ON messages;
DROP POLICY IF EXISTS "Owner access" ON chatbots;
DROP POLICY IF EXISTS "Owner access" ON campaigns;
DROP POLICY IF EXISTS "Owner access" ON campaign_messages;

-- 3. Create Strict Policies (User Isolation)
CREATE POLICY "Owner access" ON instances FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON contacts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON chatbots FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON campaigns FOR ALL USING (user_id = auth.uid());

-- Message Policies (Linked via Conversation)
CREATE POLICY "Owner access" ON messages FOR ALL USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);

-- Campaign Messages (Linked via Campaign)
CREATE POLICY "Owner access" ON campaign_messages FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);


-- 4. Update Dashboard RPC to respect User ID
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_messages BIGINT;
    v_sent_messages BIGINT;
    v_active_conversations BIGINT;
    v_instances_count BIGINT;
    v_chatbots_count BIGINT;
    v_users_count BIGINT;
    v_status_sent BIGINT;
    v_status_received BIGINT;
    v_status_pending BIGINT;
    v_status_failed BIGINT;
    v_weekly_data JSON;
    v_user_id UUID;
BEGIN
    -- Get Current User ID from Auth Context
    v_user_id := auth.uid();

    SELECT COUNT(*) INTO v_instances_count FROM instances WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_chatbots_count FROM chatbots WHERE user_id = v_user_id;
    
    -- Profiles is global, maybe just return 1 or ignore? Or count all if admin? 
    -- For now, let's just return 1 or total users if we want stats. 
    -- Let's stick to user scoped data.
    SELECT COUNT(*) INTO v_users_count FROM profiles WHERE id = v_user_id; 

    SELECT COUNT(*) INTO v_active_conversations FROM conversations WHERE user_id = v_user_id AND status != 'resolved';

    -- Messages Query (Joined with Conversations)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE m.sender = 'me'),
        COUNT(*) FILTER (WHERE m.sender = 'me'),
        COUNT(*) FILTER (WHERE m.sender != 'me'),
        COUNT(*) FILTER (WHERE m.status = 'pending'),
        COUNT(*) FILTER (WHERE m.status = 'failed')
    INTO 
        v_total_messages,
        v_sent_messages,
        v_status_sent,
        v_status_received,
        v_status_pending,
        v_status_failed
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = v_user_id;

    -- Weekly Data
    SELECT json_agg(t) INTO v_weekly_data FROM (
        SELECT 
            TO_CHAR(DATE(m.timestamp), 'Dy') as day,
            COUNT(*) as count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = v_user_id
        AND m.timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(m.timestamp)
        ORDER BY DATE(m.timestamp) DESC
    ) t;

    RETURN json_build_object(
        'totalMessages', COALESCE(v_total_messages, 0),
        'sentMessages', COALESCE(v_sent_messages, 0),
        'receivedMessages', COALESCE(v_status_received, 0),
        'activeConversations', COALESCE(v_active_conversations, 0),
        'instancesCount', COALESCE(v_instances_count, 0),
        'chatbotsCount', COALESCE(v_chatbots_count, 0),
        'usersCount', COALESCE(v_users_count, 0),
        'statusStats', json_build_object(
            'sent', COALESCE(v_status_sent, 0),
            'received', COALESCE(v_status_received, 0),
            'pending', COALESCE(v_status_pending, 0),
            'failed', COALESCE(v_status_failed, 0)
        ),
        'weeklyData', COALESCE(v_weekly_data, '[]'::json)
    );
END;
$$;
`;

async function run() {
    try {
        console.log('Applying RLS & Security Migration...');
        await pool.query(MIGRATION_SQL);
        console.log('✅ Security Migration run successfully.');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        await pool.end();
    }
}

run();
