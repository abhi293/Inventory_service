const axios = require('axios');
const { spawn } = require('child_process');

describe('Integration Tests - Complete Order Flow', () => {
  const baseUrls = {
    inventory: 'http://localhost:3001',
    order: 'http://localhost:3002',
    shipping: 'http://localhost:3003'
  };

  let createdProducts = [];
  let createdOrders = [];

  // Helper function to wait for services to be ready
  const waitForService = async (url, maxRetries = 30) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.get(`${url}/health`);
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error(`Service at ${url} is not responding`);
  };

  beforeAll(async () => {
    // Wait for all services to be ready
    console.log('Waiting for services to be ready...');
    await Promise.all([
      waitForService(baseUrls.inventory),
      waitForService(baseUrls.order),
      waitForService(baseUrls.shipping)
    ]);
    console.log('All services are ready!');
  }, 60000);

  afterAll(async () => {
    // Clean up created test data
    try {
      for (const product of createdProducts) {
        await axios.delete(`${baseUrls.inventory}/api/products/${product._id}`).catch(() => {});
      }
    } catch (error) {
      console.log('Cleanup completed');
    }
  });

  describe('Complete Order Flow', () => {
    test('should complete entire order workflow', async () => {
      // Step 1: Add products to inventory
      console.log('Step 1: Adding products to inventory...');
      
      const product1Response = await axios.post(`${baseUrls.inventory}/api/products`, {
        name: 'Integration Test Laptop',
        description: 'High-performance laptop for integration testing',
        price: 1299.99,
        quantity: 10,
        sku: `INT-LAP-${Date.now()}`
      });

      const product2Response = await axios.post(`${baseUrls.inventory}/api/products`, {
        name: 'Integration Test Mouse',
        description: 'Wireless mouse for integration testing',
        price: 49.99,
        quantity: 50,
        sku: `INT-MOU-${Date.now()}`
      });

      createdProducts.push(product1Response.data, product2Response.data);

      expect(product1Response.status).toBe(201);
      expect(product2Response.status).toBe(201);

      // Step 2: Verify inventory
      console.log('Step 2: Verifying inventory...');
      
      const inventoryResponse = await axios.get(`${baseUrls.inventory}/api/products`);
      expect(inventoryResponse.status).toBe(200);
      
      const inventory = inventoryResponse.data;
      const testProduct1 = inventory.find(p => p._id === product1Response.data._id);
      const testProduct2 = inventory.find(p => p._id === product2Response.data._id);
      
      expect(testProduct1).toBeDefined();
      expect(testProduct2).toBeDefined();
      expect(testProduct1.quantity).toBe(10);
      expect(testProduct2.quantity).toBe(50);

      // Step 3: Check availability
      console.log('Step 3: Checking product availability...');
      
      const availabilityResponse = await axios.post(`${baseUrls.inventory}/api/products/check-availability`, {
        items: [
          { productId: product1Response.data._id, quantity: 2 },
          { productId: product2Response.data._id, quantity: 1 }
        ]
      });

      expect(availabilityResponse.status).toBe(200);
      expect(availabilityResponse.data.available).toBe(true);

      // Step 4: Place order
      console.log('Step 4: Placing order...');
      
      const orderResponse = await axios.post(`${baseUrls.order}/api/orders`, {
        customerId: `INT-CUST-${Date.now()}`,
        customerName: 'Integration Test Customer',
        customerEmail: 'integration.test@example.com',
        items: [
          { productId: product1Response.data._id, quantity: 2 },
          { productId: product2Response.data._id, quantity: 1 }
        ],
        shippingAddress: {
          street: '123 Integration Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        }
      });

      expect(orderResponse.status).toBe(201);
      expect(orderResponse.data.orderId).toBeDefined();
      expect(orderResponse.data.status).toBe('confirmed');
      expect(orderResponse.data.totalAmount).toBe(2649.97); // (1299.99 * 2) + 49.99

      createdOrders.push(orderResponse.data);

      // Step 5: Verify inventory was updated
      console.log('Step 5: Verifying inventory update...');
      
      const updatedInventoryResponse = await axios.get(`${baseUrls.inventory}/api/products`);
      const updatedInventory = updatedInventoryResponse.data;
      const updatedProduct1 = updatedInventory.find(p => p._id === product1Response.data._id);
      const updatedProduct2 = updatedInventory.find(p => p._id === product2Response.data._id);
      
      expect(updatedProduct1.quantity).toBe(8); // 10 - 2
      expect(updatedProduct2.quantity).toBe(49); // 50 - 1

      // Step 6: Generate invoice
      console.log('Step 6: Generating invoice...');
      
      const invoiceResponse = await axios.get(`${baseUrls.order}/api/orders/${orderResponse.data.orderId}/invoice`);
      expect(invoiceResponse.status).toBe(200);
      expect(invoiceResponse.data.invoiceId).toBe(`INV-${orderResponse.data.orderId}`);
      expect(invoiceResponse.data.subtotal).toBe(2649.97);
      expect(invoiceResponse.data.tax).toBe(264.997);
      expect(invoiceResponse.data.total).toBe(2914.967);

      // Step 7: Wait for shipping record creation (message queue processing)
      console.log('Step 7: Waiting for shipping record creation...');
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      let shippingResponse;
      let attempts = 0;
      while (attempts < 10) {
        try {
          shippingResponse = await axios.get(`${baseUrls.shipping}/api/shipping/order/${orderResponse.data.orderId}`);
          if (shippingResponse.status === 200) break;
        } catch (error) {
          if (error.response?.status !== 404) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      expect(shippingResponse.status).toBe(200);
      expect(shippingResponse.data.orderId).toBe(orderResponse.data.orderId);
      expect(shippingResponse.data.trackingNumber).toBeDefined();
      expect(shippingResponse.data.status).toBe('processing');

      // Step 8: Track shipment
      console.log('Step 8: Tracking shipment...');
      
      const trackingResponse = await axios.get(`${baseUrls.shipping}/api/shipping/track/${shippingResponse.data.trackingNumber}`);
      expect(trackingResponse.status).toBe(200);
      expect(trackingResponse.data.trackingNumber).toBe(shippingResponse.data.trackingNumber);
      expect(trackingResponse.data.timeline).toBeDefined();
      expect(Array.isArray(trackingResponse.data.timeline)).toBe(true);
      expect(trackingResponse.data.timeline.length).toBeGreaterThan(0);

      console.log('✅ Complete order flow test passed!');
    }, 120000); // 2 minute timeout for integration test

    test('should handle insufficient inventory correctly', async () => {
      console.log('Testing insufficient inventory handling...');
      
      // Create a product with limited stock
      const productResponse = await axios.post(`${baseUrls.inventory}/api/products`, {
        name: 'Limited Stock Product',
        description: 'Product with limited stock for testing',
        price: 99.99,
        quantity: 1,
        sku: `LIM-${Date.now()}`
      });

      createdProducts.push(productResponse.data);

      // Try to order more than available
      try {
        await axios.post(`${baseUrls.order}/api/orders`, {
          customerId: `INT-CUST-${Date.now()}`,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          items: [
            { productId: productResponse.data._id, quantity: 5 } // More than available
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'Test Country'
          }
        });
        
        // Should not reach this point
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('not available');
      }

      // Verify inventory wasn't changed
      const inventoryCheck = await axios.get(`${baseUrls.inventory}/api/products/${productResponse.data._id}`);
      expect(inventoryCheck.data.quantity).toBe(1); // Should remain unchanged

      console.log('✅ Insufficient inventory handling test passed!');
    });

    test('should handle non-existent products correctly', async () => {
      console.log('Testing non-existent product handling...');
      
      const fakeProductId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist

      try {
        await axios.post(`${baseUrls.order}/api/orders`, {
          customerId: `INT-CUST-${Date.now()}`,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          items: [
            { productId: fakeProductId, quantity: 1 }
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'Test Country'
          }
        });
        
        // Should not reach this point
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('not available');
      }

      console.log('✅ Non-existent product handling test passed!');
    });
  });

  describe('Service Health Checks', () => {
    test('all services should be healthy', async () => {
      const healthChecks = await Promise.all([
        axios.get(`${baseUrls.inventory}/health`),
        axios.get(`${baseUrls.order}/health`),
        axios.get(`${baseUrls.shipping}/health`)
      ]);

      expect(healthChecks[0].status).toBe(200);
      expect(healthChecks[0].data.service).toBe('inventory-service');
      
      expect(healthChecks[1].status).toBe(200);
      expect(healthChecks[1].data.service).toBe('order-service');
      
      expect(healthChecks[2].status).toBe(200);
      expect(healthChecks[2].data.service).toBe('shipping-service');
    });
  });
});