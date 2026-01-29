$password = "sv97TRbvFxjf"
$script = "docker ps"
$tempFile = "c:\Users\levepedidos\Documents\evolutionapi\server\temp_out_v2.txt"

# Force SSH to use password authentication and skip known_hosts
$sshArgs = "-tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o PreferredAuthentications=password root@135.181.37.206 `"$script`""

$process = New-Object System.Diagnostics.Process
$process.StartInfo.FileName = "ssh"
$process.StartInfo.Arguments = $sshArgs
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.RedirectStandardInput = $true
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true

$process.Start() | Out-Null
Start-Sleep -Seconds 2

# Try writing the password multiple times in case it missed the prompt
$process.StandardInput.WriteLine($password)
Start-Sleep -Seconds 1
$process.StandardInput.WriteLine($password)
Start-Sleep -Seconds 5

$output = $process.StandardOutput.ReadToEnd()
$errOut = $process.StandardError.ReadToEnd()

$output + $errOut | Out-File $tempFile
$process.WaitForExit()
