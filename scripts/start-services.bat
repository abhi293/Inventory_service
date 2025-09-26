@echo off
echo Starting Order Management System services...
echo.

echo Checking if Docker is running...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running or not installed
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo Starting services with Docker Compose...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 10 >nul

echo.
echo Checking service health...

:check_inventory
curl -f http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo Waiting for Inventory Service...
    timeout /t 2 >nul
    goto check_inventory
)
echo ✓ Inventory Service is ready

:check_order
curl -f http://localhost:3002/health >nul 2>&1
if errorlevel 1 (
    echo Waiting for Order Service...
    timeout /t 2 >nul
    goto check_order
)
echo ✓ Order Service is ready

:check_shipping
curl -f http://localhost:3003/health >nul 2>&1
if errorlevel 1 (
    echo Waiting for Shipping Service...
    timeout /t 2 >nul
    goto check_shipping
)
echo ✓ Shipping Service is ready

echo.
echo ✅ All services are ready!
echo You can now run tests with: npm run test:all
echo.