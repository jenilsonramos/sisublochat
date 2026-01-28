import { Client } from 'ssh2';

const conn = new Client();

const OLD_SUBDOMAIN = "kvjpmwvwlbkqlsdysmxy";
const NEW_URL = "https://banco.ublochat.com.br";
const NEW_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM4MDQ2MDAwfQ.XdZPpX9J4qZcZqf9yZxZVZ0dFz9L7Nn8X9V2n5wF8JY";
const NEW_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzgwNDYwMDB9.A9sFJ7XwP3KZtQmMZL0kFJX2PZJ3m8Qn1R8w6bN5A";

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Find all files containing the old URL and replace them
    const cmds = [
        `grep -rkl "${OLD_SUBDOMAIN}" /root /var/www --exclude-dir=node_modules 2>/dev/null | xargs -I {} sed -i 's|https://${OLD_SUBDOMAIN}.supabase.co|${NEW_URL}|g' {}`,
        `grep -rkl "VITE_SUPABASE_ANON_KEY" /root /var/www --exclude-dir=node_modules 2>/dev/null | xargs -I {} sed -i 's|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=${NEW_ANON}|g' {}`,
        `grep -rkl "SUPABASE_SERVICE_KEY" /root /var/www --exclude-dir=node_modules 2>/dev/null | xargs -I {} sed -i 's|SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=${NEW_SERVICE}|g' {}`
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Replacement finished. Now checking if we can find a docker-compose to restart.');
            // Try to find docker-compose files and restart
            conn.exec("find /root /var/www -name 'docker-compose*' 2>/dev/null", (err2, stream2) => {
                stream2.on('data', (d) => console.log('COMPOSE FOUND: ' + d));
                stream2.on('close', () => conn.end());
            });
        });
    });
}).connect({
    host: '89.167.4.98',
    port: 22,
    username: 'root',
    password: 'TuAim3MdvuNr',
    readyTimeout: 60000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
