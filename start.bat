@echo off
title CampusConnect Orchestrator
echo ============================================================
echo      🚀 Starting CampusConnect Application Suite 🚀
echo ============================================================
echo.

cd CampusConnect

:: Start Backend
echo [1/2] Starting Express Backend...
start "CampusConnect Backend" cmd /k "cd backend && echo Starting backend dev server... && npm run dev"

:: Start Frontend
echo [2/2] Starting React Frontend...
start "CampusConnect Frontend" cmd /k "cd frontend && echo Starting frontend dev server... && npm run dev"

echo.
echo ============================================================
echo ✅ BOTH SERVERS ARE LAUNCHED!
echo.
echo 🌐 Backend running at: http://localhost:5000
echo 🌐 Frontend running at: http://localhost:3000
echo.
echo Please keep the two opened terminal windows running.
echo To stop the application, simply close those terminal windows.
echo ============================================================
echo.
pause
