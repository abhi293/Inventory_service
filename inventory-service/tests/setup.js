// Test setup file
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/inventory_test';

// Increase test timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during testing
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.error = jest.fn();
}