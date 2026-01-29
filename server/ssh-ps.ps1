$password = "sv97TRbvFxjf"
$script = "docker ps"
$tempFile = "c:\Users\levepedidos\Documents\evolutionapi\server\temp_out.txt"

$process = New-Object System.Diagnostics.Process
$process.StartInfo.FileName = "ssh"
$process.StartInfo.Arguments = "-tt -o StrictHostKeyChecking=no root@135.181.37.206 `"$script`""
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.RedirectStandardInput = $true
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true

$process.Start() | Out-Null
Start-Sleep -Milliseconds 500
$process.StandardInput.WriteLine($password)
Start-Sleep -Seconds 5

$output = $process.StandardOutput.ReadToEnd()
$errOut = $process.StandardError.ReadToEnd()

$output + $errOut | Out-File $tempFile
$process.WaitForExit()
