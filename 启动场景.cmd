@echo off
cd /d "%~dp0"
if not exist node_modules\three\package.json call npm install
echo.
echo SHIBUYA / AFTER HOURS
echo Open http://localhost:4173 in your browser.
echo Keep this window open while exploring the city.
echo.
call npm start
pause
