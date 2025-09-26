#!/usr/bin/env node

const TestDataManager = require('./test-data-manager');

async function setupTestEnvironment() {
  const dataManager = new TestDataManager();
  
  try {
    console.log('🚀 Setting up test environment...\n');
    
    // Wait for all services to be ready
    await dataManager.waitForServices();
    console.log('');
    
    // Setup test products
    const productIds = await dataManager.setupTestProducts();
    console.log('');
    
    // Create a sample test order
    if (productIds.length > 0) {
      await dataManager.createTestOrder('TEST-CUSTOMER', productIds[0], 2);
      console.log('');
    }
    
    console.log('✅ Test environment setup completed!');
    console.log(`Created ${productIds.length} products and sample orders`);
    console.log('\nYou can now run your tests using:');
    console.log('npm test');
    console.log('npm run test:integration');
    console.log('npm run test:load');
    console.log('npm run test:api');
    
  } catch (error) {
    console.error('❌ Test environment setup failed:', error.message);
    process.exit(1);
  }
}

async function resetTestEnvironment() {
  const dataManager = new TestDataManager();
  
  try {
    console.log('🧹 Resetting test environment...\n');
    
    await dataManager.waitForServices();
    await dataManager.resetDatabase();
    
    console.log('\n✅ Test environment reset completed!');
    
  } catch (error) {
    console.error('❌ Test environment reset failed:', error.message);
    process.exit(1);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'reset') {
  resetTestEnvironment();
} else if (command === 'setup' || !command) {
  setupTestEnvironment();
} else {
  console.log('Usage: node setup-test-environment.js [setup|reset]');
  console.log('  setup (default): Setup test data');
  console.log('  reset: Clean up test data');
  process.exit(1);
}