import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== CRIANDO BUCKET avatars ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "INSERT INTO storage.buckets (id, name, public) VALUES (\'avatars\', \'avatars\', true) ON CONFLICT (name) DO NOTHING;" 2>&1',
        'echo "=== CONFIGURANDO POLÍTICAS DE ACESSO (PERMISSIVO PARA TESTE) ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "CREATE POLICY \\"Public Access\\" ON storage.objects FOR ALL USING (bucket_id = \'avatars\') WITH CHECK (bucket_id = \'avatars\');" 2>&1'
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
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
