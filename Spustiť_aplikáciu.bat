@echo off
chcp 65001 >nul
title DocProps Studio - Spustenie aplikacie

echo ========================================================
echo   DocProps Studio - Office Metadata Editor
echo ========================================================
echo.
echo Otvaram aplikaciu v predvolenom prehliadaci...
echo.

start "" "%~dp0index.html"

exit
