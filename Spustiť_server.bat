@echo off
chcp 65001 >nul
title DocProps Studio - Local Server

echo ========================================================
echo   Spustam lokalny server pre DocProps Studio...
echo ========================================================
echo.

python "%~dp0server.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python nebol najdeny alebo zlyhal.
    echo Otvaram aplikaciu priamo cez HTML...
    start "" "%~dp0index.html"
)

pause
