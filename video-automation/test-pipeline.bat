@echo off
REM Quick test script - records a short demo

echo Testing video pipeline...
echo.

echo Step 1: Recording checkout flow...
call npm run record checkout

if errorlevel 1 (
    echo Recording failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Processing video...
call npm run process checkout

if errorlevel 1 (
    echo Processing failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Building final video...
call npm run howto checkout

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Test Complete!
echo ========================================
echo.
echo Check output/HOWTO_checkout_FINAL.mp4
echo.
pause

