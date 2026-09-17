@echo off
title ThelaExpress - Push to GitHub for 24/7 Render Cloud Deployment
color 0A
cls
echo ====================================================================
echo      THELAEXPRESS - 24/7 CLOUD DEPLOYMENT (GITHUB + RENDER)
echo ====================================================================
echo.
echo Step 1: Make sure you have created a new empty repository on GitHub:
echo         https://github.com/new
echo         (e.g., repository name: thela-express)
echo.
echo Step 2: Copy your GitHub repository URL (HTTPS).
echo         Example: https://github.com/YourUsername/thela-express.git
echo.
echo ====================================================================
set /p REPO_URL="Paste your GitHub Repository URL here and press Enter: "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL provided. Aborting.
    pause
    exit /b
)

echo.
echo [1/3] Setting remote origin to %REPO_URL%...
"C:\Users\anura\AppData\Local\MinGit\cmd\git.exe" remote remove origin 2>nul
"C:\Users\anura\AppData\Local\MinGit\cmd\git.exe" remote add origin %REPO_URL%

echo [2/3] Renaming branch to main...
"C:\Users\anura\AppData\Local\MinGit\cmd\git.exe" branch -M main

echo [3/3] Pushing all files to GitHub...
"C:\Users\anura\AppData\Local\MinGit\cmd\git.exe" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo   SUCCESS! All ThelaExpress files pushed to your GitHub repository!
    echo ====================================================================
    echo.
    echo Now open Render.com to deploy it in 60 seconds:
    echo 1. Go to https://dashboard.render.com/select-repo?type=web
    echo 2. Choose your repository: thela-express
    echo 3. Click 'Deploy Web Service'
    echo.
    echo Your app will be online 24/7 forever, even when laptop is OFF!
) else (
    echo.
    echo [NOTE] If GitHub asked you to sign in or if authentication failed,
    echo make sure you are logged in to GitHub or use a Personal Access Token.
)

echo.
pause
