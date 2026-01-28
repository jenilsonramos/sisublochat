import { Client } from 'ssh2';

const conn = new Client();

const OLD_SUBDOMAIN = "kvjpmwvwlbkqlsdysmxy";
const NEW_URL = "https://banco.ublochat.com.br";
const NEW_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM4MDQ2MDAwfQ.XdZPpX9J4qZcZqf9yZxZVZ0dFz9L7Nn8X9V2n5wF8JY";

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Find files and list them before replacing
    const cmds = [
        `find /root /var/www -type f -exec grep -l "${OLD_SUBDOMAIN}" {} + 2>/dev/null`,
        "echo '---REPLACING---'",
        `find /root /var/www -type f -exec grep -l "${OLD_SUBDOMAIN}" {} + 2>/dev/null | xargs -I {} sed -i "s|https://${OLD_SUBDOMAIN}.supabase.co|${NEW_URL}|g" {}`,
        `find /root /var/www -type f -exec grep -l "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anBtd3Z3bGJrcWxzZHlzbXh5" {} + 2>/dev/null | xargs -I {} sed -i "s|eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anBtd3Z3bGJrcWxzZHlzbXh5[^ ]*|${NEW_ANON}|g" {}`
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Mass replacement finished.');
            conn.end();
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
