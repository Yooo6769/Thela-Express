@echo off
title ThelaExpress - Vendor Self-Onboarding
cd /d "C:\Users\anura\.gemini\antigravity\scratch\thela-express-prod\server"

netstat -ano | findstr :5000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting ThelaExpress Live Backend Server...
    start /b "" "C:\Program Files\nodejs\node.exe" src/server.js
    timeout /t 2 /nobreak >nul
)

echo Launching Street Vendor Onboarding Portal...
start http://localhost:5000/onboard-vendor.html
exit
