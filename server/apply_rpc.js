import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Construct connection string from Env Vars (Docker standard)
const connectionString = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new pg.Pool({
    connectionString,
    // ssl: { rejectUnauthorized: false } // Removed: Server does not support SSL
});


const MIGRATION_SQL = `
-- Migration: create_dashboard_stats_rpc
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
BEGIN
    SELECT COUNT(*) INTO v_instances_count FROM instances;
    SELECT COUNT(*) INTO v_chatbots_count FROM chatbots;
    SELECT COUNT(*) INTO v_users_count FROM profiles;
    SELECT COUNT(*) INTO v_active_conversations FROM conversations WHERE status != 'resolved';

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
    FROM messages;

    SELECT json_agg(t) INTO v_weekly_data FROM (
        SELECT 
            TO_CHAR(DATE(timestamp), 'Dy') as day,
            COUNT(*) as count
        FROM messages 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) DESC
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
        console.log('Applying migration...');
        await pool.query(MIGRATION_SQL);
        console.log('✅ Migration run successfully.');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        await pool.end();
    }
}

run();
