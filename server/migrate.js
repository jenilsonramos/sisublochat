import fs from 'fs';
import path from 'path';
import pool from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    try {
        console.log(`Iniciando migração ${process.env.DB_TYPE || 'sqlite'}...`);
        const schemaFile = process.env.DB_TYPE === 'mysql' ? 'mysql_schema.sql' : 'sqlite_schema.sql';
        const sqlPath = path.join(__dirname, '..', schemaFile);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Dividir o SQL em comandos individuais por ponto e vírgula
        // Nota: Isso é simples e pode falhar se houver ; dentro de strings,
        // mas para nosso schema atual funciona bem.
        const commands = sql
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        for (const command of commands) {
            console.log(`Executando: ${command.substring(0, 50)}...`);
            await pool.query(command);
        }

        console.log('Migração concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro na migração:', error);
        process.exit(1);
    }
}

migrate();
