const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const Order = require('../src/models/Order');

// Mock the inventory service and message queue
jest.mock('../src/services/inventoryService');
jest.mock('../src/services/messageQueue');

const inventoryService = require('../src/services/inventoryService');
const messageQueue = require('../src/services/messageQueue');

describe('Order Service', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/orders_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Order.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'order-service'
      });
    });
  });

  describe('Order Management', () => {
    const sampleOrder = {
      customerId: 'CUST001',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      items: [
        {
          productId: '507f1f77bcf86cd799439011',
          quantity: 2
        }
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zipCode: '12345',
        country: 'USA'
      }
    };

    test('POST /api/orders should create a new order', async () => {
      // Mock inventory service responses
      inventoryService.checkAvailability.mockResolvedValue({
        available: true,
        items: [
          {
            productId: '507f1f77bcf86cd799439011',
            available: true,
            product: {
              name: 'Test Product',
              price: 99.99
            }
          }
        ]
      });

      inventoryService.updateQuantity.mockResolvedValue({});
      messageQueue.publishOrderEvent.mockResolvedValue();

      const response = await request(app)
        .post('/api/orders')
        .send(sampleOrder)
        .expect(201);

      expect(response.body.customerId).toBe(sampleOrder.customerId);
      expect(response.body.customerName).toBe(sampleOrder.customerName);
      expect(response.body.status).toBe('confirmed');
      expect(response.body.orderId).toBeDefined();
      expect(response.body.totalAmount).toBeDefined();

      // Verify inventory service was called
      expect(inventoryService.checkAvailability).toHaveBeenCalledWith(sampleOrder.items);
      expect(inventoryService.updateQuantity).toHaveBeenCalled();
      expect(messageQueue.publishOrderEvent).toHaveBeenCalled();
    });

    test('POST /api/orders should fail when products are not available', async () => {
      inventoryService.checkAvailability.mockResolvedValue({
        available: false,
        items: [
          {
            productId: '507f1f77bcf86cd799439011',
            available: false,
            reason: 'Insufficient quantity'
          }
        ]
      });

      await request(app)
        .post('/api/orders')
        .send(sampleOrder)
        .expect(400);

      // Verify inventory was not updated and no event was published
      expect(inventoryService.updateQuantity).not.toHaveBeenCalled();
      expect(messageQueue.publishOrderEvent).not.toHaveBeenCalled();
    });

    test('GET /api/orders should return all orders', async () => {
      // Create test order directly in database
      const order = await Order.create({
        orderId: 'TEST-001',
        customerId: 'CUST001',
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        items: [{
          productId: '507f1f77bcf86cd799439011',
          productName: 'Test Product',
          quantity: 1,
          price: 99.99,
          totalPrice: 99.99
        }],
        totalAmount: 99.99,
        shippingAddress: sampleOrder.shippingAddress
      });

      const response = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].orderId).toBe(order.orderId);
    });

    test('GET /api/orders/:id should return specific order', async () => {
      const order = await Order.create({
        orderId: 'TEST-001',
        customerId: 'CUST001',
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        items: [{
          productId: '507f1f77bcf86cd799439011',
          productName: 'Test Product',
          quantity: 1,
          price: 99.99,
          totalPrice: 99.99
        }],
        totalAmount: 99.99,
        shippingAddress: sampleOrder.shippingAddress
      });

      const response = await request(app)
        .get(`/api/orders/${order.orderId}`)
        .expect(200);

      expect(response.body.orderId).toBe(order.orderId);
      expect(response.body.customerName).toBe(order.customerName);
    });

    test('GET /api/orders/:id should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/NON-EXISTENT')
        .expect(404);
    });
  });

  describe('Invoice Generation', () => {
    test('GET /api/orders/:id/invoice should generate invoice', async () => {
      const order = await Order.create({
        orderId: 'TEST-001',
        customerId: 'CUST001',
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        items: [{
          productId: '507f1f77bcf86cd799439011',
          productName: 'Test Product',
          quantity: 2,
          price: 99.99,
          totalPrice: 199.98
        }],
        totalAmount: 199.98,
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zipCode: '12345',
          country: 'USA'
        }
      });

      const response = await request(app)
        .get(`/api/orders/${order.orderId}/invoice`)
        .expect(200);

      expect(response.body.invoiceId).toBe(`INV-${order.orderId}`);
      expect(response.body.orderId).toBe(order.orderId);
      expect(response.body.subtotal).toBe(order.totalAmount);
      expect(response.body.tax).toBe(order.totalAmount * 0.1);
      expect(response.body.total).toBe(order.totalAmount * 1.1);
      expect(response.body.customerInfo.name).toBe(order.customerName);
      expect(response.body.items).toHaveLength(1);
    });

    test('GET /api/orders/:id/invoice should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/NON-EXISTENT/invoice')
        .expect(404);
    });
  });
});