@echo off
title ThelaExpress - Customer Delivery App
cd /d "C:\Users\anura\.gemini\antigravity\scratch\thela-express-prod\server"

:: Check if Node is running on port 5000
netstat -ano | findstr :5000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting ThelaExpress Live Backend Server...
    start /b "" "C:\Program Files\nodejs\node.exe" src/server.js
    timeout /t 2 /nobreak >nul
)

echo Launching Customer Web App...
start http://localhost:5000
exit
