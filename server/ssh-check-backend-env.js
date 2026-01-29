import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== VARIÁVEIS DE AMBIENTE DO CONTAINER BACKEND ==="',
        'docker exec ublochat-backend-1 env | grep -E "DB_HOST|DB_PORT|DB_USER|DB_NAME|SUPABASE|EVOLUTION"',
        'echo ""',
        'echo "=== TESTANDO CONEXÃO COM BANCO SUPABASE ==="',
        'docker exec ublochat-backend-1 node -e "const pg = require(\'pg\'); const c = new pg.Client({host:\'194.163.189.247\',port:5432,user:\'postgres\',password:\'e52f57838865b7d25b4b8a161b3d3efa\',database:\'postgres\'}); c.connect().then(()=>{console.log(\'✅ Conectado ao Supabase!\'); return c.query(\'SELECT COUNT(*) FROM messages\');}).then(r=>console.log(\'Mensagens:\',r.rows[0].count)).catch(e=>console.log(\'❌\',e.message)).finally(()=>c.end())"',
        'echo ""',
        'echo "=== LOGS DO BACKEND (últimos 20) ==="',
        'docker logs ublochat-backend-1 2>&1 | tail -20'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '77.42.84.214',
    port: 22,
    username: 'root',
    password: 'heagkwqejgxh',
    readyTimeout: 60000
});
