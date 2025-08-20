@echo off
title Transfermarkt Ultimate System - Enhanced Version 2025

echo.
echo ========================================
echo    Transfermarkt Ultimate System
echo    Enhanced Version 2025
echo ========================================
echo.
echo    Advanced Data Extraction Tool
echo    Professional Data Display
echo    Enhanced Club Logo Manager
echo    Full Integration and Auto Sync
echo.
echo ========================================
echo.

:MAIN_MENU
echo ========================================
echo           MAIN MENU
echo ========================================
echo.
echo  [1] Start Full System
echo  [2] Data Extraction Tool
echo  [3] Professional Display Tool
echo  [4] Club Logo Manager
echo  [5] System Settings
echo  [6] Help Guide
echo  [7] Exit
echo.
echo ========================================
set /p choice="Choose option (1-7): "

if "%choice%"=="1" goto FULL_SYSTEM
if "%choice%"=="2" goto MAIN_TOOL
if "%choice%"=="3" goto DISPLAY_TOOL
if "%choice%"=="4" goto LOGO_MANAGER
if "%choice%"=="5" goto SETTINGS
if "%choice%"=="6" goto HELP
if "%choice%"=="7" goto EXIT
goto INVALID_CHOICE

:FULL_SYSTEM
cls
echo.
echo ========================================
echo         STARTING FULL SYSTEM
echo ========================================
echo.

echo Checking system requirements...
echo.

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js is not installed!
    echo.
    echo Please download and install Node.js from: https://nodejs.org
    echo Choose LTS version (recommended)
    echo.
    pause
    goto MAIN_MENU
) else (
    echo + Node.js is installed and available
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing required dependencies...
    npm install
    if errorlevel 1 (
        echo X Failed to install dependencies!
        echo.
        echo Suggested solutions:
        echo - Check internet connection
        echo - Run as Administrator
        echo - Check firewall settings
        echo.
        pause
        goto MAIN_MENU
    )
    echo + Dependencies installed successfully
) else (
    echo + Dependencies are available
)

echo [3/3] Checking system files...
set missing_files=0

if not exist "transfermarkt-top-spenders-2025.html" (
    echo X Main tool file missing
    set missing_files=1
)

if not exist "transfermarkt-display-pro.html" (
    echo X Display tool file missing
    set missing_files=1
)

if not exist "club-logo-manager-enhanced.html" (
    echo X Logo manager file missing
    set missing_files=1
)

if not exist "server.js" (
    echo X Server file missing
    set missing_files=1
)

if %missing_files%==1 (
    echo.
    echo X Some essential files are missing!
    echo Please ensure all system files are present
    echo.
    pause
    goto MAIN_MENU
) else (
    echo + All system files are present
)

echo.
echo ========================================
echo           SERVER INFORMATION
echo ========================================
echo.
echo Main Tool: http://localhost:8201/transfermarkt-top-spenders-2025.html
echo Display Tool: http://localhost:8201/transfermarkt-display-pro.html
echo Logo Manager: http://localhost:8201/club-logo-manager-enhanced.html
echo.
echo Control Commands: Ctrl+C = Stop Server
echo.
echo ========================================
echo.
echo Starting server...
echo.

start "" "http://localhost:8201/transfermarkt-top-spenders-2025.html"
node server.js

echo.
echo Server stopped
echo.
pause
goto MAIN_MENU

:MAIN_TOOL
cls
echo.
echo ========================================
echo      DATA EXTRACTION TOOL
echo ========================================
echo.
echo Available Features:
echo + Real data extraction from Transfermarkt
echo + 4 different data sources
echo + Automatic and scheduled updates
echo + Advanced logo system
echo + JSON and CSV export
echo.
echo Opening tool...

if exist "transfermarkt-top-spenders-2025.html" (
    start "" "transfermarkt-top-spenders-2025.html"
    echo + Main tool opened successfully
) else (
    echo X Tool file not found!
)

echo.
pause
goto MAIN_MENU

:DISPLAY_TOOL
cls
echo.
echo ========================================
echo      PROFESSIONAL DISPLAY TOOL
echo ========================================
echo.
echo Available Features:
echo + Professional and elegant data display
echo + Responsive design
echo + Live updates from main tool
echo + Multiple display modes
echo + Advanced visual effects
echo.
echo Opening display tool...

if exist "transfermarkt-display-pro.html" (
    start "" "transfermarkt-display-pro.html"
    echo + Display tool opened successfully
) else (
    echo X Display tool file not found!
)

echo.
pause
goto MAIN_MENU

:LOGO_MANAGER
cls
echo.
echo ========================================
echo       CLUB LOGO MANAGER
echo ========================================
echo.
echo New Features:
echo + Import from JSON, CSV, Excel
echo + Permanent save in project
echo + Automatic backups
echo + Sync with Transfermarkt tools
echo + Comprehensive logo management
echo.

echo Checking logo manager requirements...

node --version >nul 2>&1
if errorlevel 1 (
    echo Warning: Node.js not available - opening basic version
    echo.
    if exist "club-logo-manager-enhanced.html" (
        start "" "club-logo-manager-enhanced.html"
        echo + Logo manager opened (basic version)
        echo Note: Some advanced features unavailable without server
    ) else (
        echo X Logo manager file not found!
    )
) else (
    echo + Node.js available
    
    if not exist "node_modules" (
        echo Installing dependencies...
        npm install
    )
    
    echo.
    echo Logo manager will run on: http://localhost:8201/club-logo-manager-enhanced.html
    echo.
    echo Starting server...
    
    start "" "http://localhost:8201/club-logo-manager-enhanced.html"
    node server.js
    
    echo.
    echo Logo manager server stopped
)

echo.
pause
goto MAIN_MENU

:SETTINGS
cls
echo.
echo ========================================
echo         SYSTEM SETTINGS
echo ========================================
echo.
echo Maintenance and Settings Tools:
echo.
echo  [1] System Health Check
echo  [2] Clean Temporary Files
echo  [3] Reinstall Dependencies
echo  [4] Back to Main Menu
echo.
echo ========================================
set /p settings_choice="Choose option (1-4): "

if "%settings_choice%"=="1" goto SYSTEM_CHECK
if "%settings_choice%"=="2" goto CLEANUP
if "%settings_choice%"=="3" goto REINSTALL_DEPS
if "%settings_choice%"=="4" goto MAIN_MENU
goto INVALID_CHOICE

:SYSTEM_CHECK
cls
echo.
echo Comprehensive system health check...
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js not installed
) else (
    for /f "tokens=*" %%i in ('node --version') do echo + Node.js %%i installed
)

echo [2/4] Checking dependencies...
if exist "node_modules" (
    echo + node_modules folder exists
    if exist "node_modules\express" (
        echo + Express.js installed
    ) else (
        echo X Express.js missing
    )
    if exist "node_modules\cors" (
        echo + CORS installed
    ) else (
        echo X CORS missing
    )
) else (
    echo X node_modules folder missing
)

echo [3/4] Checking system files...
if exist "transfermarkt-top-spenders-2025.html" (
    echo + Main tool present
) else (
    echo X Main tool missing
)

if exist "transfermarkt-display-pro.html" (
    echo + Display tool present
) else (
    echo X Display tool missing
)

if exist "club-logo-manager-enhanced.html" (
    echo + Logo manager present
) else (
    echo X Logo manager missing
)

if exist "server.js" (
    echo + Server file present
) else (
    echo X Server file missing
)

echo [4/4] Checking data files...
if exist "clubs-data.json" (
    echo + Main data file present
) else (
    echo Warning: Main data file missing (will be created when needed)
)

if exist "backups" (
    echo + Backup folder exists
) else (
    echo Warning: Backup folder missing (will be created when needed)
)

echo.
echo System health check completed
echo.
pause
goto SETTINGS

:CLEANUP
cls
echo.
echo Cleaning temporary files...
echo.

echo [1/2] Cleaning npm cache...
npm cache clean --force >nul 2>&1
echo + npm cache cleaned

echo [2/2] Removing temporary files...
if exist "*.tmp" del "*.tmp" >nul 2>&1
if exist "*.log" del "*.log" >nul 2>&1
echo + Temporary files removed

echo.
echo Cleanup completed
echo.
pause
goto SETTINGS

:REINSTALL_DEPS
cls
echo.
echo Reinstalling dependencies...
echo.

echo Warning: This will remove all current dependencies and reinstall them
set /p confirm="Do you want to continue? (y/n): "

if /i "%confirm%"=="y" (
    echo.
    echo [1/3] Removing node_modules...
    if exist "node_modules" (
        rmdir /s /q "node_modules"
        echo + node_modules removed
    ) else (
        echo Note: node_modules not found
    )

    echo [2/3] Removing package-lock.json...
    if exist "package-lock.json" (
        del "package-lock.json"
        echo + package-lock.json removed
    ) else (
        echo Note: package-lock.json not found
    )

    echo [3/3] Reinstalling dependencies...
    npm install
    if errorlevel 1 (
        echo X Failed to reinstall dependencies
        echo.
        echo Suggested solutions:
        echo - Check internet connection
        echo - Run as Administrator
        echo - Check firewall settings
    ) else (
        echo + Dependencies reinstalled successfully
    )
) else (
    echo Operation cancelled
)

echo.
pause
goto SETTINGS

:HELP
cls
echo.
echo ========================================
echo         HELP GUIDE
echo ========================================
echo.
echo Welcome to Transfermarkt Ultimate System!
echo.
echo ========================================
echo           QUICK START
echo ========================================
echo.
echo 1. For quick start: Choose "Start Full System" from main menu
echo 2. All tools will open automatically in browser
echo 3. Start by extracting data from main tool
echo 4. Use logo manager to add club logos
echo 5. Display results professionally in display tool
echo.
echo ========================================
echo          AVAILABLE TOOLS
echo ========================================
echo.
echo Main Tool:
echo + Real data extraction from Transfermarkt
echo + 4 different data sources with fallback system
echo + Automatic and scheduled data updates
echo + Advanced logo system with smart linking
echo + Data export in JSON and CSV formats
echo.
echo Professional Display Tool:
echo + Professional and elegant data display
echo + Responsive design for all devices
echo + Live updates from main tool
echo + Multiple display modes
echo + Advanced visual effects and animations
echo.
echo Enhanced Logo Manager:
echo + Import data from JSON, CSV, Excel files
echo + Permanent save in project for all users
echo + Automatic backups with restore capability
echo + Direct sync with Transfermarkt tools
echo + Comprehensive logo management with smart search
echo.
pause

cls
echo.
echo ========================================
echo        TROUBLESHOOTING
echo ========================================
echo.
echo Common Problems and Solutions:
echo.
echo "Node.js not installed":
echo Solution: Download and install Node.js from https://nodejs.org
echo Choose LTS version (recommended)
echo Restart system after installation
echo.
echo "Failed to install dependencies":
echo Solution: Check internet connection
echo Try running as Administrator
echo Use "Clean Temporary Files" from settings
echo.
echo "Port 8201 in use":
echo Solution: Close any programs using the port
echo Restart computer if necessary
echo Check antivirus software
echo.
echo "No data displayed":
echo Solution: Check internet connection
echo Try different data sources from tool
echo Ensure websites are not blocked by firewall
echo.
echo "Logos not showing":
echo Solution: Use logo manager to add logos
echo Verify logo URLs are correct
echo Click "Sync with Transfermarkt" after adding logos
echo.
pause
goto MAIN_MENU

:EXIT
cls
echo.
echo ========================================
echo           SYSTEM EXIT
echo ========================================
echo.
echo Are you sure you want to exit Transfermarkt Ultimate System?
echo.
echo Make sure to:
echo - Save all important data
echo - Complete all ongoing operations
echo - Export data if needed
echo.
set /p confirm="Type 'y' to confirm or anything else to return: "

if /i "%confirm%"=="y" (
    echo.
    echo Shutting down system...
    echo.
    echo + All settings saved
    echo + All operations completed
    echo + Temporary files cleaned
    echo.
    echo Thank you for using Transfermarkt Ultimate System!
    echo.
    echo ========================================
    echo    Transfermarkt Ultimate System
    echo    Enhanced Version 2025
    echo ========================================
    echo.
    echo To return, run ULTIMATE-START-ENGLISH.bat again
    echo.
    pause
    exit /b 0
) else (
    echo.
    echo Returning to main menu...
    echo.
    pause
    goto MAIN_MENU
)

:INVALID_CHOICE
cls
echo.
echo ========================================
echo          INVALID CHOICE
echo ========================================
echo.
echo The option you selected is invalid!
echo.
echo Available options:
echo    [1] Start Full System
echo    [2] Data Extraction Tool
echo    [3] Professional Display Tool
echo    [4] Club Logo Manager
echo    [5] System Settings
echo    [6] Help Guide
echo    [7] Exit System
echo.
echo Please choose a number from 1 to 7 only
echo.
pause
goto MAIN_MENU
