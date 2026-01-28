import { spawn } from 'child_process';

const ssh = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', 'root@135.181.37.206', 'docker ps'], {
    stdio: 'pipe'
});

// Send password immediately
ssh.stdin.write('umrivvELEseN\n');

ssh.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

ssh.stderr.on('data', (data) => {
    console.log(`STDERR: ${data}`);
});

ssh.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
});

// Kill after 10s if stuck
setTimeout(() => ssh.kill(), 10000);
