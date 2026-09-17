# Cloudflare Tunnel Launcher Daemon
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $PSScriptRoot) { $PSScriptRoot = Get-Location }

$exePath = Join-Path $PSScriptRoot "cloudflared.exe"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $exePath
$psi.Arguments = "tunnel --url http://localhost:5000"
$psi.RedirectStandardError = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($psi)

$tunnelUrl = ""
for ($i = 0; $i -lt 60; $i++) {
    if (-not $proc.StandardError.EndOfStream) {
        $line = $proc.StandardError.ReadLine()
        Write-Host $line
        if ($line -match "(https://[a-zA-Z0-9.-]+\.trycloudflare\.com)") {
            $tunnelUrl = $matches[1]
            break
        }
    }
    Start-Sleep -Milliseconds 250
}

Write-Host "=================================="
Write-Host "CLOUDFLARE_URL: $tunnelUrl"
Write-Host "=================================="

if ($tunnelUrl) {
    Set-Content -Path (Join-Path $PSScriptRoot "active-tunnel-url.txt") -Value $tunnelUrl -Force
}

while (-not $proc.HasExited) {
    if (-not $proc.StandardError.EndOfStream) {
        $null = $proc.StandardError.ReadLine()
    }
    Start-Sleep -Seconds 2
}
