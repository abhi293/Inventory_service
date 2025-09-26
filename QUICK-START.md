# Order Management System - Quick Start Guide

## Prerequisites

1. **Docker Desktop** - Make sure Docker is installed and running
2. **Node.js** (version 18+)
3. **Git** (for cloning)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Services
```bash
# Option 1: Use the convenience script (Windows)
npm run services:start

# Option 2: Use Docker Compose directly
docker-compose up -d

# Option 3: Check if services are running
curl http://localhost:3001/health
curl http://localhost:3002/health  
curl http://localhost:3003/health
```

### 3. Run Tests
```bash
# Run all tests
npm run test:all

# Or run individual test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:load         # Load tests
npm run test:api          # API tests
```

### 4. Stop Services
```bash
npm run services:stop
# or
docker-compose down
```

## Troubleshooting

### "Cannot find module" errors
Make sure you've installed dependencies:
```bash
npm install
```

### "Service not responding" errors
1. Check if Docker is running: `docker --version`
2. Start services: `npm run services:start`
3. Wait for services to be ready (30-60 seconds)
4. Verify health: `curl http://localhost:3001/health`

### Port conflicts
If ports 3001-3003 are in use, stop other services or modify `docker-compose.yml`

### Docker issues
```bash
# Clean up Docker resources
npm run clean

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Service URLs

- **Inventory Service**: http://localhost:3001
- **Order Service**: http://localhost:3002  
- **Shipping Service**: http://localhost:3003
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## API Documentation

Once services are running, visit:
- http://localhost:3001/api-docs (Inventory API)
- http://localhost:3002/api-docs (Order API)
- http://localhost:3003/api-docs (Shipping API)