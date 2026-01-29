import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test the API call using curl from within the server
    // We'll use the service role key to see if it works without RLS first
    const cmd = `
SUPABASE_URL="http://localhost:8000"
SERVICE_ROLE_KEY=$(docker exec $(docker ps -q -f name=supabase_rest) printenv PGRST_JWT_SECRET)
# Note: In self-hosted, the service key might be different. 
# We'll try to just query with the anon key and no RLS first if possible, 
# or just run a query that identifies schema errors.

# Let's try to get the OpenAPI spec, it's the best way to see schema errors
curl -s http://localhost:8000/
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== OPENAPI SPEC / SCHEMA STATUS ===');
            // If it returns a large JSON, it's working. If 404/500/etc, it's broken.
            console.log(output.substring(0, 500));
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
