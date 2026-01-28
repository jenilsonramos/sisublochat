import { spawn } from 'child_process';

const ssh = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', 'root@135.181.37.206', 'docker ps'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

ssh.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

ssh.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`STDERR: ${output}`);
    if (output.toLowerCase().includes('password:')) {
        console.log('Sending password...');
        ssh.stdin.write('umrivvELEseN\n');
    }
});

ssh.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
});
