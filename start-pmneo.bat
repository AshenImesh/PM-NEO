@echo off
REM PMNEO launcher - starts the API + app, then opens the browser.
start "PMNEO API" cmd /k "cd /d C:\Users\hp\Desktop\PMNEO\pmneo\server && node index.js"
start "PMNEO App" cmd /k "cd /d C:\Users\hp\Desktop\PMNEO\pmneo\client && npm run dev"
timeout /t 5 >nul
start http://localhost:5173
echo PMNEO is starting: API on :3001, app on :5173
