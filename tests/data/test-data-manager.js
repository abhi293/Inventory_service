const axios = require('axios');
const { testProducts } = require('./test-data');

const INVENTORY_URL = process.env.INVENTORY_URL || 'http://localhost:3001';
const ORDER_URL = process.env.ORDER_URL || 'http://localhost:3002';
const SHIPPING_URL = process.env.SHIPPING_URL || 'http://localhost:3003';

class TestDataManager {
  constructor() {
    this.createdProducts = [];
    this.createdOrders = [];
  }

  async waitForServices() {
    console.log('Waiting for services to be ready...');
    const services = [
      { name: 'Inventory', url: `${INVENTORY_URL}/health` },
      { name: 'Order', url: `${ORDER_URL}/health` },
      { name: 'Shipping', url: `${SHIPPING_URL}/health` }
    ];

    for (const service of services) {
      let retries = 30; // 30 seconds timeout
      while (retries > 0) {
        try {
          await axios.get(service.url, { timeout: 1000 });
          console.log(`✓ ${service.name} service is ready`);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            throw new Error(`${service.name} service failed to start`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  async setupTestProducts() {
    console.log('Setting up test products...');
    
    for (const product of testProducts) {
      try {
        const response = await axios.post(`${INVENTORY_URL}/api/products`, product);
        this.createdProducts.push(response.data._id);
        console.log(`✓ Created product: ${product.name} (ID: ${response.data._id})`);
      } catch (error) {
        console.error(`✗ Failed to create product ${product.name}:`, error.message);
      }
    }
    
    return this.createdProducts;
  }

  async createTestOrder(customerId, productId, quantity = 1) {
    console.log(`Creating test order for customer ${customerId}...`);
    
    const orderData = {
      customerId: customerId,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      items: [{
        productId: productId,
        quantity: quantity
      }],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      }
    };

    try {
      const response = await axios.post(`${ORDER_URL}/api/orders`, orderData);
      this.createdOrders.push(response.data.orderId);
      console.log(`✓ Created order: ${response.data.orderId}`);
      return response.data;
    } catch (error) {
      console.error('✗ Failed to create test order:', error.response?.data || error.message);
      throw error;
    }
  }

  async cleanupTestData() {
    console.log('Cleaning up test data...');
    
    // Clean up products
    for (const productId of this.createdProducts) {
      try {
        await axios.delete(`${INVENTORY_URL}/api/products/${productId}`);
        console.log(`✓ Deleted product: ${productId}`);
      } catch (error) {
        console.log(`⚠ Could not delete product ${productId}: ${error.message}`);
      }
    }

    // Note: Orders and shipping records may not have delete endpoints
    // This is typical in production systems for audit trail purposes
    
    this.createdProducts = [];
    this.createdOrders = [];
  }

  async resetDatabase() {
    console.log('Resetting test databases...');
    
    try {
      // This would typically connect directly to MongoDB to clear test collections
      // For now, we'll use the API cleanup approach
      await this.cleanupTestData();
      console.log('✓ Database reset completed');
    } catch (error) {
      console.error('✗ Database reset failed:', error.message);
    }
  }

  getCreatedProducts() {
    return [...this.createdProducts];
  }

  getCreatedOrders() {
    return [...this.createdOrders];
  }
}

module.exports = TestDataManager;