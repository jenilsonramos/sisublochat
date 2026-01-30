import pg from 'pg';

const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new pg.Pool({ connectionString });

const MIGRATION_SQL = `
-- 1. Add user_id to messages for faster RLS
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 2. Add user_id to campaign_messages
ALTER TABLE campaign_messages ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_user_id ON campaign_messages(user_id);

-- 3. Backfill user_id from parents
UPDATE messages m 
SET user_id = c.user_id 
FROM conversations c 
WHERE m.conversation_id = c.id 
AND m.user_id IS NULL;

UPDATE campaign_messages cm
SET user_id = c.user_id
FROM campaigns c
WHERE cm.campaign_id = c.id
AND cm.user_id IS NULL;

-- 4. Re-enable RLS and optimized policies
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner access" ON instances;
DROP POLICY IF EXISTS "Owner access" ON contacts;
DROP POLICY IF EXISTS "Owner access" ON conversations;
DROP POLICY IF EXISTS "Owner access" ON messages;
DROP POLICY IF EXISTS "Owner access" ON chatbots;
DROP POLICY IF EXISTS "Owner access" ON campaigns;
DROP POLICY IF EXISTS "Owner access" ON campaign_messages;

CREATE POLICY "Owner access" ON instances FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON contacts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON messages FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON chatbots FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON campaigns FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Owner access" ON campaign_messages FOR ALL USING (user_id = auth.uid());

-- 5. Optimized Dashboard RPC (Direct indexing)
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
    v_user_id := auth.uid();

    -- Return empty stats if no user
    IF v_user_id IS NULL THEN
        RETURN json_build_object('totalMessages', 0, 'sentMessages', 0, 'receivedMessages', 0, 'activeConversations', 0, 'instancesCount', 0, 'chatbotsCount', 0, 'usersCount', 0, 'statusStats', json_build_object('sent', 0, 'received', 0, 'pending', 0, 'failed', 0), 'weeklyData', '[]'::json);
    END IF;

    SELECT COUNT(*) INTO v_instances_count FROM instances WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_chatbots_count FROM chatbots WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_users_count FROM profiles WHERE id = v_user_id; 
    SELECT COUNT(*) INTO v_active_conversations FROM conversations WHERE user_id = v_user_id AND status != 'resolved';

    -- Fast messages query using direct user_id index
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE sender = 'me'),
        COUNT(*) FILTER (WHERE sender = 'me'),
        COUNT(*) FILTER (WHERE sender != 'me'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO 
        v_total_messages,
        v_sent_messages,
        v_status_sent,
        v_status_received,
        v_status_pending,
        v_status_failed
    FROM messages 
    WHERE user_id = v_user_id;

    -- Optimized Weekly Data
    SELECT json_agg(t) INTO v_weekly_data FROM (
        SELECT 
            TO_CHAR(DATE(timestamp), 'Dy') as day,
            COUNT(*) as count
        FROM messages 
        WHERE user_id = v_user_id
        AND timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) DESC
        LIMIT 7
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
        console.log('Applying Database Optimizations...');
        await pool.query(MIGRATION_SQL);
        console.log('✅ Optimization successful.');
    } catch (e) {
        console.error('❌ Optimization Error:', e);
    } finally {
        await pool.end();
    }
}

run();
