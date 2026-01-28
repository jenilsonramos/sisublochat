import { Client } from 'ssh2';

const conn = new Client();

const envLocal = `VITE_SUPABASE_URL=https://banco.ublochat.com.br
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM4MDQ2MDAwfQ.XdZPpX9J4qZcZqf9yZxZVZ0dFz9L7Nn8X9V2n5wF8JY
VITE_EVOLUTION_API_URL=https://api.ublochat.com.br
VITE_EVOLUTION_API_KEY=da1900feae82ae3a1f234966ccad7a03
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51N7SZpL35eGxCk7FPZzFSYAChMx1vDaVGyw8XR53xsI1RDjsaxZ0RyGBSTZJZvzuQOi05VshWw4UTaWpGNp4vQr800KUXAsj2D
VITE_MERCADO_PAGO_PUBLIC_KEY=TEST-4375540a-9d6e-47f6-a57e-790906a24683
`;

const serverEnv = `PORT=3001
DB_TYPE=postgres
DB_HOST=135.181.37.206
DB_PORT=5432
DB_USER=postgres
DB_PASS=R8mF9kP2sQ4VxA7ZLwC3eT
DB_NAME=postgres
JWT_SECRET=Zx9A2KfP0WmLQ7sH8E5R1D4B6yVtJ3C
SUPABASE_URL=https://banco.ublochat.com.br
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzgwNDYwMDB9.A9sFJ7XwP3KZtQmMZL0kFJX2PZJ3m8Qn1R8w6bN5A
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM4MDQ2MDAwfQ.XdZPpX9J4qZcZqf9yZxZVZ0dFz9L7Nn8X9V2n5wF8JY
CRON_SECRET=YguewFD0UO1u0s/ggrYF2ieY3zoi+q1q3uFC0/STLwo=
`;

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on App Server');

    // We assume /root/evolutionapi is the correct path from earlier find results
    const cmds = [
        "cd /root/evolutionapi",
        `echo '${envLocal}' > .env.local`,
        `echo '${serverEnv}' > server/.env`,
        "docker compose -f docker-compose.prod.yml up -d --build"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('App update finished.');
            conn.end();
        });
    });
}).connect({
    host: '89.167.4.98',
    port: 22,
    username: 'root',
    password: 'TuAim3MdvuNr',
    readyTimeout: 300000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
