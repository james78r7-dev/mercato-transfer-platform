@echo off
title Test Transfermarkt System

echo.
echo ========================================
echo      Transfermarkt System Test
echo ========================================
echo.

echo Running system check...
echo.

echo [1/5] Checking ULTIMATE-START-ENGLISH.bat...
if exist "ULTIMATE-START-ENGLISH.bat" (
    echo + ULTIMATE-START-ENGLISH.bat file exists
) else (
    echo X ULTIMATE-START-ENGLISH.bat file missing!
    goto ERROR
)

echo [2/5] Checking HTML files...
if exist "transfermarkt-top-spenders-2025.html" (
    echo + Main tool present
) else (
    echo X Main tool missing!
    goto ERROR
)

if exist "transfermarkt-display-pro.html" (
    echo + Display tool present
) else (
    echo X Display tool missing!
    goto ERROR
)

if exist "club-logo-manager-enhanced.html" (
    echo + Logo manager present
) else (
    echo X Logo manager missing!
    goto ERROR
)

echo [3/5] Checking server files...
if exist "server.js" (
    echo + Server file present
) else (
    echo X Server file missing!
    goto ERROR
)

if exist "package.json" (
    echo + package.json file present
) else (
    echo X package.json file missing!
    goto ERROR
)

echo [4/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Warning: Node.js not installed
    echo System will work with limited features
) else (
    echo + Node.js installed and available
)

echo [5/5] Checking dependencies...
if exist "node_modules" (
    echo + node_modules folder exists
) else (
    echo Warning: node_modules folder missing
    echo Dependencies will be installed when running
)

echo.
echo ========================================
echo        TEST RESULTS
echo ========================================
echo.
echo + All essential files are present
echo + System is ready to run
echo.
echo To run the system:
echo 1. Double-click ULTIMATE-START-ENGLISH.bat
echo 2. Choose "Start Full System"
echo 3. Wait for tools to load
echo.
echo ========================================
echo.
pause
exit /b 0

:ERROR
echo.
echo ========================================
echo           SYSTEM ERROR
echo ========================================
echo.
echo X Some essential files are missing!
echo Please ensure all system files are present
echo.
pause
exit /b 1
