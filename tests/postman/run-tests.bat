@echo off
echo Starting Order Management System API Tests...
echo.

REM Check if Newman is installed
where newman >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Newman not found. Installing Newman...
    npm install -g newman
    npm install -g newman-reporter-html
)

REM Run the API tests
node run-api-tests.js

echo.
echo API tests completed!
pause