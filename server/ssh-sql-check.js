import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');
    // Get all container names to identify the db container
    conn.exec("docker ps -a --format '{{.Names}}'", (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            const containers = fullOutput.trim().split('\n');
            const dbContainer = containers.find(c => c.includes('db'));
            console.log('Target DB Container:', dbContainer);

            if (!dbContainer) {
                console.log('❌ DB Container not found!');
                conn.end();
                return;
            }

            // Execute SQL via docker exec
            // We'll run a simple check first
            conn.exec(`docker exec -i ${dbContainer} psql -U postgres -d postgres -c "SELECT current_database();"`, (err, stream) => {
                if (err) throw err;
                stream.on('data', (data) => console.log('SQL OUT: ' + data));
                stream.on('close', () => conn.end());
            });
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 20000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
