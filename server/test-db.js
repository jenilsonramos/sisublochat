import pool from './db.js';

async function test() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('Conexão bem sucedida:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Falha na conexão:', error);
        process.exit(1);
    }
}

test();
