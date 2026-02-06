@echo off
REM SQL Syntax Validator for V17__baseline_after_squash.sql
REM Checks for common syntax errors and errors

setlocal enabledelayedexpansion

set "SQLFILE=..\src\main\resources\db\migration\V17__baseline_after_squash.sql"
set "ERRORS=0"

echo =====================================
echo SQL Syntax Validation
echo =====================================
echo File: %SQLFILE%
echo.

REM Check if file exists
if not exist "%SQLFILE%" (
    echo ERROR: File not found!
    exit /b 1
)

echo [1/6] Checking for unclosed DO blocks...
findstr /C:"DO $$" "%SQLFILE%" > temp_do.txt
findstr /C:"END $$;" "%SQLFILE%" > temp_end.txt
for /f %%a in ('find /c /v "" ^< temp_do.txt') do set DO_COUNT=%%a
for /f %%a in ('find /c /v "" ^< temp_end.txt') do set END_COUNT=%%a
del temp_do.txt temp_end.txt

if !DO_COUNT! NEQ !END_COUNT! (
    echo    ERROR: Unmatched DO/END blocks! DO: !DO_COUNT!, END: !END_COUNT!
    set /a ERRORS+=1
) else (
    echo    OK: All DO blocks closed ^(!DO_COUNT! blocks^)
)

echo.
echo [2/6] Checking for missing semicolons after CREATE TABLE...
findstr /R /C:"CREATE TABLE.*)" "%SQLFILE%" | findstr /V ";" > nul
if !ERRORLEVEL! EQU 0 (
    echo    WARNING: Possible missing semicolons found
    set /a ERRORS+=1
) else (
    echo    OK: No obvious missing semicolons
)

echo.
echo [3/6] Checking for code_normalized references in indexes...
findstr /C:"code_normalized" "%SQLFILE%" | findstr /C:"INDEX" | findstr /V /C:"-- " > nul
if !ERRORLEVEL! EQU 0 (
    echo    ERROR: Found code_normalized in index definition!
    findstr /N /C:"code_normalized" "%SQLFILE%" | findstr /C:"INDEX" | findstr /V /C:"-- "
    set /a ERRORS+=1
) else (
    echo    OK: No code_normalized in indexes
)

echo.
echo [4/6] Verifying coupons table has 'code' column...
findstr /C:"code VARCHAR(100)" "%SQLFILE%" > nul
if !ERRORLEVEL! EQU 0 (
    echo    OK: 'code' column found in coupons table
) else (
    echo    ERROR: 'code' column not found!
    set /a ERRORS+=1
)

echo.
echo [5/6] Checking idx_coupon_code index definition...
findstr /N /C:"idx_coupon_code" "%SQLFILE%" > temp_idx.txt
type temp_idx.txt
findstr /C:"code)" temp_idx.txt > nul
if !ERRORLEVEL! EQU 0 (
    echo    OK: Index uses 'code' column
) else (
    echo    ERROR: Index may use wrong column!
    set /a ERRORS+=1
)
del temp_idx.txt

echo.
echo [6/6] Checking for common SQL syntax issues...
findstr /C:"CONSTRAINT CONSTRAINT" "%SQLFILE%" > nul
if !ERRORLEVEL! EQU 0 (
    echo    ERROR: Duplicate CONSTRAINT keyword found!
    set /a ERRORS+=1
) else (
    echo    OK: No duplicate CONSTRAINT keywords
)

echo.
echo =====================================
echo Validation Complete
echo =====================================
if !ERRORS! GTR 0 (
    echo STATUS: FAILED ^(!ERRORS! errors found^)
    exit /b 1
) else (
    echo STATUS: PASSED ^(No errors found^)
    exit /b 0
)
