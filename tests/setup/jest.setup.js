// Jest setup file for global test configuration
const axios = require('axios');

// Set default timeout for tests
jest.setTimeout(30000);

// Global test configuration
global.testConfig = {
  inventory: {
    baseURL: process.env.INVENTORY_URL || 'http://localhost:3001',
    timeout: 10000
  },
  order: {
    baseURL: process.env.ORDER_URL || 'http://localhost:3002', 
    timeout: 10000
  },
  shipping: {
    baseURL: process.env.SHIPPING_URL || 'http://localhost:3003',
    timeout: 10000
  }
};

// Configure axios defaults for testing
axios.defaults.timeout = 10000;
axios.defaults.validateStatus = function (status) {
  // Don't throw on HTTP error status codes in tests
  return status >= 200 && status < 600;
};

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForService = async (url, maxRetries = 10) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${url}/health`);
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      // Service not ready, wait and retry
    }
    await global.delay(1000);
  }
  throw new Error(`Service at ${url} not ready after ${maxRetries} retries`);
};

// Setup and teardown hooks
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  
  // Wait for services to be ready (if running integration tests)
  if (process.env.INTEGRATION_TESTS === 'true') {
    try {
      await global.waitForService(global.testConfig.inventory.baseURL);
      await global.waitForService(global.testConfig.order.baseURL);
      await global.waitForService(global.testConfig.shipping.baseURL);
      console.log('✅ All services are ready');
    } catch (error) {
      console.warn('⚠️ Some services may not be available:', error.message);
    }
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Force close any open mongoose connections
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Close all mongoose connections
  await mongoose.disconnect();
  
  // Give a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Console output formatting for tests
const originalConsoleLog = console.log;
console.log = function(...args) {
  if (process.env.NODE_ENV === 'test') {
    // Reduce console noise during tests
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Test')) {
      return;
    }
  }
  originalConsoleLog.apply(console, args);
};