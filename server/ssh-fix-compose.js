import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

const newCompose = `version: '3.8'

services:
  app_backend:
    build: 
      context: ./server
    container_name: ublochat_backend
    restart: always
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_TYPE=postgres
      - DB_HOST=135.181.37.206
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASS=R8mF9kP2sQ4VxA7ZLwC3eT
      - DB_NAME=postgres
    networks:
      - supabase_network


  app_frontend:
    build:
      context: .
      args:
        - VITE_SUPABASE_URL=https://banco.ublochat.com.br
        - VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM4MDQ2MDAwfQ.XdZPpX9J4qZcZqf9yZxZVZ0dFz9L7Nn8X9V2n5wF8JY
        - VITE_EVOLUTION_API_URL=https://api.ublochat.com.br
        - VITE_EVOLUTION_API_KEY=da1900feae82ae3a1f234966ccad7a03
    container_name: ublochat_frontend
    restart: always
    expose:
      - "80"
    networks:
      - supabase_network

  caddy:
    image: caddy:latest
    container_name: ublochat_caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - supabase_network
    depends_on:
      - app_frontend
      - app_backend

volumes:
  caddy_data:
  caddy_config:
  postgres_data: 

networks:
  supabase_network:
    external: true
`;

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Update compose file and trigger build
    const cmds = [
        `echo '${newCompose}' > /root/evolutionapi/docker-compose.prod.yml`,
        "cd /root/evolutionapi",
        "docker compose -f docker-compose.prod.yml up -d --build"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log(data.toString());
        });
        stream.on('stderr', (data) => {
            console.error(data.toString());
        });
        stream.on('close', (code, signal) => {
            console.log('Docker compose up finished with code:', code);
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 600000 // 10 minutes
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
