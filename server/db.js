import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let db;

if (DB_TYPE === 'mysql') {
    db = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else if (DB_TYPE === 'postgres') {
    const { Pool } = pg;
    const pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        // ssl: { rejectUnauthorized: false } // Disabled for internal docker network
    });

    // Wrapper to mimic mysql2 interface for Postgres
    db = {
        query: async (sql, params = []) => {
            try {
                // 1. Convert ? to $1, $2, etc. (if not already using $n)
                let paramIdx = 1;
                // Only replace ? if we are not manually using $ (dumb check but works for this codebase)
                const pgSql = sql.includes('$1') ? sql : sql.replace(/\?/g, () => `$${paramIdx++}`);

                // 2. Execute
                const res = await pool.query(pgSql, params);

                // 3. Return [rows, fields] format
                return [res.rows, res.fields];
            } catch (err) {
                console.error('SQL Error:', err.message, '\nQuery:', sql);
                throw err;
            }
        },
        end: () => pool.end()
    };
} else {
    // SQLite
    const dbPath = path.join(__dirname, 'database.sqlite');
    db = new Database(dbPath);

    // Wrapper para simular a API do mysql2/promise (query)
    const originalQuery = db.prepare.bind(db);
    db.query = async (sql, params = []) => {
        // Converter Sintaxe MySQL (INSERT ... ON DUPLICATE KEY) para SQLite se necessário
        // Por enquanto, vamos apenas rodar.
        const stmt = db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return [stmt.all(...params)];
        } else {
            const info = stmt.run(...params);
            return [info];
        }
    };
}

export default db;
