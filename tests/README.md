# Testing Documentation

This document describes the comprehensive testing infrastructure for the Order Management System.

## Testing Overview

The system includes multiple types of tests to ensure reliability and performance:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test service interactions and end-to-end workflows
- **Load Tests**: Test performance under various load conditions
- **API Tests**: Test REST API endpoints with Postman/Newman

## Test Structure

```
tests/
├── unit/                     # Unit tests for each service
│   ├── inventory.test.js     # Inventory service unit tests
│   ├── order.test.js         # Order service unit tests
│   └── shipping.test.js      # Shipping service unit tests
├── integration/              # Integration tests
│   └── integration.test.js   # End-to-end workflow tests
├── load/                     # Load testing configurations
│   ├── load-test-config.yml  # Artillery load test configuration
│   ├── inventory-load.yml    # Inventory service specific load tests
│   ├── order-load.yml        # Order service specific load tests
│   └── shipping-load.yml     # Shipping service specific load tests
├── postman/                  # API testing with Postman/Newman
│   ├── Order-Management-System.postman_collection.json
│   ├── environment.dev.json  # Development environment variables
│   ├── run-api-tests.js      # Newman automation script
│   └── run-tests.bat         # Windows batch script for API tests
├── data/                     # Test data management
│   ├── test-data.js          # Test data definitions
│   ├── test-data-manager.js  # Test data setup/cleanup utilities
│   └── setup-test-environment.js  # Environment setup script
├── setup/                    # Test configuration
│   └── jest.setup.js         # Jest global configuration
├── reports/                  # Test reports (generated)
│   ├── coverage/             # Code coverage reports
│   ├── newman-report.html    # API test reports
│   └── load-test-results/    # Load test reports
└── test-runner.js           # Comprehensive test runner
```

## Prerequisites

1. **Node.js** (version 18+)
2. **Docker and Docker Compose** (for running services)
3. **Test Dependencies** (installed via npm):

```bash
npm install
```

## Running Tests

### Quick Start - All Tests

Run the complete test suite:

```bash
npm run test:all
```

This will:
1. Setup test environment and data
2. Run all test types in sequence
3. Generate comprehensive reports
4. Clean up test data

### Individual Test Types

#### Unit Tests
Test individual service components:

```bash
npm test
# or
npm run test:unit
```

#### Integration Tests
Test service interactions:

```bash
npm run test:integration
```

#### Load Tests
Test performance under load:

```bash
npm run test:load
```

#### API Tests
Test REST endpoints with Newman:

```bash
npm run test:api
```

### Test Environment Management

#### Setup Test Data
Populate services with test data:

```bash
npm run test:setup
```

#### Reset Test Environment
Clean up all test data:

```bash
npm run test:reset
```

## Test Configuration

### Environment Variables

Set these environment variables to customize test behavior:

```bash
# Service URLs (default: localhost)
INVENTORY_URL=http://localhost:3001
ORDER_URL=http://localhost:3002
SHIPPING_URL=http://localhost:3003

# Test settings
NODE_ENV=test
INTEGRATION_TESTS=true
```

### Jest Configuration

Jest is configured in `package.json` with:
- Coverage reporting enabled
- HTML and LCOV coverage formats
- Custom test patterns
- Global setup file

### Load Test Configuration

Artillery load tests are configured with:
- **Warm-up phase**: 5 users over 30 seconds
- **Sustained load**: 10 users over 60 seconds  
- **Peak load**: 20 users over 30 seconds

Modify `tests/load/load-test-config.yml` to adjust load patterns.

## Test Data

### Products
- Gaming Laptop ($1899.99, qty: 5)
- Wireless Mouse ($49.99, qty: 25)
- Mechanical Keyboard ($129.99, qty: 15)
- USB-C Hub ($79.99, qty: 20)
- External Monitor ($399.99, qty: 8)

### Test Customers
- John Doe (CUST001)
- Jane Smith (CUST002)
- Bob Johnson (CUST003)

## API Testing with Postman

### Collection Structure
The Postman collection includes:

1. **Inventory Service Tests**
   - Health check
   - Create product
   - Get products
   - Check availability

2. **Order Service Tests**
   - Health check
   - Create order
   - Get order details
   - Generate invoice

3. **Shipping Service Tests**
   - Health check
   - Get shipping by order ID
   - Track shipment

### Running API Tests

#### Using Newman (Automated)
```bash
npm run test:api
```

#### Using Postman GUI
1. Import `tests/postman/Order-Management-System.postman_collection.json`
2. Import `tests/postman/environment.dev.json`
3. Run the collection

### Test Reports

API test reports are generated in:
- HTML: `tests/reports/newman-report.html`
- JSON: `tests/reports/newman-report.json`

## Load Testing

### Artillery Configuration

Load tests simulate realistic usage patterns:

```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 30
      arrivalRate: 5    # Warm up
    - duration: 60  
      arrivalRate: 10   # Sustained load
    - duration: 30
      arrivalRate: 20   # Peak load
```

### Running Load Tests

```bash
# Run all load tests
npm run test:load

# Run specific service load test
npx artillery run tests/load/inventory-load.yml
```

### Load Test Reports

Reports include:
- Request/response metrics
- Error rates
- Response time percentiles
- Throughput statistics

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: docker-compose up -d
      - run: npm run test:all
      - run: docker-compose down
```

## Troubleshooting

### Common Issues

1. **Services not ready**
   - Ensure Docker containers are running
   - Check service health endpoints
   - Increase timeout in Jest setup

2. **Port conflicts**
   - Check if ports 3001-3003 are available
   - Update docker-compose.yml if needed

3. **Test timeouts**
   - Increase Jest timeout in setup file
   - Check service performance

4. **Load test failures**
   - Verify services can handle expected load
   - Check system resources

### Debug Commands

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health  
curl http://localhost:3003/health

# View service logs
npm run logs

# Reset everything
npm run clean
npm run test:setup
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Data Cleanup**: Always clean up test data
3. **Realistic Data**: Use representative test data
4. **Performance**: Monitor test execution time
5. **Coverage**: Aim for high code coverage
6. **Documentation**: Keep tests well documented

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add appropriate test data cleanup
3. Update this documentation
4. Ensure tests pass in CI environment
5. Add load tests for new endpoints