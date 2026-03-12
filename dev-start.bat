@echo off
title Rollbook Dev Environment
echo Starting Rollbook backend and frontend...
echo.

:: Start backend in its own window
start "Rollbook Backend (port 3000)" cmd /k "cd /d "%~dp0backend" && node server.js"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend in its own window
start "Rollbook Frontend (port 5173)" cmd /k "cd /d "%~dp0frontend" && npx vite"

echo Both servers are starting:
echo   Backend  -> http://localhost:3000
echo   Frontend -> http://localhost:5173
echo.
echo Close the two windows to stop the servers.
pause
