@echo off
title Push ThelaExpress to GitHub
cd /d "%~dp0"
echo ========================================================
echo   Pushing ThelaExpress to GitHub (Yooo6769/Thela-Express)
echo ========================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! All code successfully pushed to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo   If prompted, please sign in to GitHub in your browser.
    echo ========================================================
)
echo.
pause
