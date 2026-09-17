# Script to acquire and maintain localhost.run tunnel URL
$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = "ssh.exe"
$pinfo.Arguments = "-o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=10 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:5000 nokey@localhost.run"
$pinfo.RedirectStandardOutput = $true
$pinfo.RedirectStandardError = $true
$pinfo.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($pinfo)

$tunnelUrl = ""
for ($i = 0; $i -lt 60; $i++) {
    if (-not $proc.StandardOutput.EndOfStream) {
        $line = $proc.StandardOutput.ReadLine()
        Write-Host $line
        if ($line -match "(https://[a-zA-Z0-9.-]+\.lhr\.life)") {
            $tunnelUrl = $matches[1]
            break
        }
    }
    Start-Sleep -Milliseconds 300
}

Write-Host "=================================="
Write-Host "ASSIGNED_URL: $tunnelUrl"
Write-Host "=================================="

if ($tunnelUrl) {
    Set-Content -Path "active-tunnel-url.txt" -Value $tunnelUrl -Force
}

# Keep alive in background and continuously drain buffer
while (-not $proc.HasExited) {
    if (-not $proc.StandardOutput.EndOfStream) {
        $null = $proc.StandardOutput.ReadLine()
    }
    Start-Sleep -Seconds 2
}
