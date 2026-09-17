@echo off
title ThelaExpress - iPhone Safari HTTPS Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-live-https.ps1"
pause
