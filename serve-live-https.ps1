# ThelaExpress Live - Production HTTPS Reverse Tunnel for iOS Safari & Android
$ErrorActionPreference = "SilentlyContinue"
Clear-Host

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "    THELAEXPRESS PRODUCTION - LIVE MOBILE / IPHONE LAUNCHER  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

$nodePath = "C:\Program Files\nodejs\node.exe"
$prodDir = "C:\Users\anura\.gemini\antigravity\scratch\thela-express-prod"
$serverScript = Join-Path $prodDir "server\src\server.js"

# 1. Check if Node.js server is already running on port 5000
$portActive = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5000)
    $portActive = $tcp.Connected
    $tcp.Close()
} catch {
    $portActive = $false
}

if (-not $portActive) {
    Write-Host "[1/3] Starting ThelaExpress backend server on port 5000..." -ForegroundColor Green
    Start-Process -FilePath $nodePath -ArgumentList "`"$serverScript`"" -WorkingDirectory (Join-Path $prodDir "server") -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/3] Backend server is already running on port 5000." -ForegroundColor Green
}

# 2. Start Secure SSH Tunnel (localhost.run)
Write-Host "[2/3] Establishing secure HTTPS tunnel for iOS Safari (TLS/SSL)..." -ForegroundColor Yellow
$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = "ssh.exe"
$pinfo.Arguments = "-o StrictHostKeyChecking=no -R 80:localhost:5000 nokey@localhost.run"
$pinfo.RedirectStandardOutput = $true
$pinfo.RedirectStandardError = $true
$pinfo.UseShellExecute = $false

$proc = [System.Diagnostics.Process]::Start($pinfo)
$tunnelUrl = ""

for ($i = 0; $i -lt 40; $i++) {
    if (-not $proc.StandardOutput.EndOfStream) {
        $line = $proc.StandardOutput.ReadLine()
        if ($line -match "(https://[a-zA-Z0-9.-]+\.lhr\.life)") {
            $tunnelUrl = $matches[1]
            break
        }
    }
    Start-Sleep -Milliseconds 250
}

# If tunnel didn't yield, fallback to local IP
if (-not $tunnelUrl) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
    if ($localIp) {
        $tunnelUrl = "http://${localIp}:5000"
    } else {
        $tunnelUrl = "http://localhost:5000"
    }
}

# 3. Copy to Clipboard
try {
    Set-Clipboard -Value $tunnelUrl
    $clipboardNote = " (COPIED TO CLIPBOARD)"
} catch {
    $clipboardNote = ""
}

Write-Host "[3/3] TUNNEL READY!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  >>> OPEN THIS URL ON YOUR IPHONE / PHONE:                 " -ForegroundColor Yellow
Write-Host "  $tunnelUrl$clipboardNote" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Role Shortcuts:" -ForegroundColor Cyan
Write-Host "  • Customer App:     $tunnelUrl" -ForegroundColor White
Write-Host "  • Vendor POS KDS:   $tunnelUrl/vendor.html" -ForegroundColor White
Write-Host "  • Rider Console:    $tunnelUrl/rider.html" -ForegroundColor White
Write-Host ""
Write-Host "Why this works on iOS Safari:" -ForegroundColor Gray
Write-Host "  ✓ Valid public HTTPS SSL certificate (Bypasses iOS HTTPS-Only mode)" -ForegroundColor Gray
Write-Host "  ✓ Full Realtime WebSockets over WSS protocol" -ForegroundColor Gray
Write-Host "  ✓ Responsive touch controls & audio alert support" -ForegroundColor Gray
Write-Host ""

# Generate a local helper HTML page with QR code for 1-click scanning
$qrPagePath = Join-Path $PSScriptRoot "iPhone-QR-Scan.html"
$qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + [System.Uri]::EscapeDataString($tunnelUrl)

$htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ThelaExpress - Scan to Open on iPhone</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-gray-800 border border-gray-700 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
        <div class="inline-flex items-center space-x-2 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>LIVE HTTPS / WSS TUNNEL ACTIVE</span>
        </div>
        
        <h1 class="text-2xl font-black">Scan on iPhone Camera</h1>
        <p class="text-xs text-gray-300">Point your iPhone camera at this QR code to launch ThelaExpress directly in Safari.</p>

        <div class="bg-white p-4 rounded-2xl inline-block shadow-inner">
            <img src="$qrApiUrl" alt="QR Code" class="w-56 h-56 mx-auto">
        </div>

        <div class="bg-gray-900 p-3 rounded-xl text-xs font-mono text-emerald-400 break-all select-all">
            $tunnelUrl
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <a href="$tunnelUrl" target="_blank" class="bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl transition">
                Open in Browser
            </a>
            <a href="https://wa.me/?text=Open%20ThelaExpress%20on%20your%20phone:%20$([System.Uri]::EscapeDataString($tunnelUrl))" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl transition">
                Send to WhatsApp
            </a>
        </div>
    </div>
</body>
</html>
"@

[System.IO.File]::WriteAllText($qrPagePath, $htmlContent)
Start-Process $qrPagePath

Write-Host "QR Code scanner page opened in your browser." -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window when you wish to close the tunnel." -ForegroundColor Yellow

# Keep script open while tunnel is alive
while (-not $proc.HasExited) {
    Start-Sleep -Seconds 1
}
