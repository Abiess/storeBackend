@echo off
REM Quick setup script for Windows

echo ========================================
echo   Video Automation Setup
echo ========================================
echo.

echo [1/4] Installing Node.js dependencies...
call npm install
if errorlevel 1 goto error

echo.
echo [2/4] Installing Playwright browsers...
call npm run install:browsers
if errorlevel 1 goto error

echo.
echo [3/4] Setting up environment...
if not exist .env (
    copy .env.example .env
    echo Created .env file - please edit with your settings
) else (
    echo .env file already exists
)

echo.
echo [4/4] Creating output directories...
if not exist output mkdir output
if not exist assets mkdir assets

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Edit .env with your settings
echo   2. Add your logo to assets/logo.png
echo   3. Run: npm run record checkout
echo.
echo Check README.md for full documentation
echo.
pause
goto end

:error
echo.
echo ========================================
echo   Setup Failed!
echo ========================================
echo.
echo Please check the error messages above
pause
exit /b 1

:end

