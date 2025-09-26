const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const Shipping = require('../src/models/Shipping');

describe('Shipping Service', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shipping_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Shipping.deleteMany({});
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
        service: 'shipping-service'
      });
    });
  });

  describe('Shipping Management', () => {
    const sampleShipping = {
      shippingId: 'SHIP-TEST001',
      orderId: 'ORDER-001',
      customerId: 'CUST001',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zipCode: '12345',
        country: 'USA'
      },
      items: [{
        productId: '507f1f77bcf86cd799439011',
        productName: 'Test Product',
        quantity: 2,
        price: 99.99
      }],
      totalAmount: 199.98,
      trackingNumber: 'TRK123456789',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    test('GET /api/shipping should return all shipping records', async () => {
      await Shipping.create(sampleShipping);

      const response = await request(app)
        .get('/api/shipping')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].shippingId).toBe(sampleShipping.shippingId);
    });

    test('GET /api/shipping/:id should return specific shipping record', async () => {
      await Shipping.create(sampleShipping);

      const response = await request(app)
        .get(`/api/shipping/${sampleShipping.shippingId}`)
        .expect(200);

      expect(response.body.shippingId).toBe(sampleShipping.shippingId);
      expect(response.body.orderId).toBe(sampleShipping.orderId);
    });

    test('GET /api/shipping/:id should return 404 for non-existent shipping record', async () => {
      await request(app)
        .get('/api/shipping/NON-EXISTENT')
        .expect(404);
    });

    test('GET /api/shipping/order/:orderId should return shipping by order ID', async () => {
      await Shipping.create(sampleShipping);

      const response = await request(app)
        .get(`/api/shipping/order/${sampleShipping.orderId}`)
        .expect(200);

      expect(response.body.orderId).toBe(sampleShipping.orderId);
      expect(response.body.shippingId).toBe(sampleShipping.shippingId);
    });

    test('GET /api/shipping/order/:orderId should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/shipping/order/NON-EXISTENT')
        .expect(404);
    });
  });

  describe('Tracking', () => {
    const sampleShipping = {
      shippingId: 'SHIP-TEST001',
      orderId: 'ORDER-001',
      customerId: 'CUST001',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zipCode: '12345',
        country: 'USA'
      },
      items: [{
        productId: '507f1f77bcf86cd799439011',
        productName: 'Test Product',
        quantity: 2,
        price: 99.99
      }],
      totalAmount: 199.98,
      trackingNumber: 'TRK123456789',
      status: 'shipped',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    test('GET /api/shipping/track/:trackingNumber should return tracking info', async () => {
      await Shipping.create(sampleShipping);

      const response = await request(app)
        .get(`/api/shipping/track/${sampleShipping.trackingNumber}`)
        .expect(200);

      expect(response.body.trackingNumber).toBe(sampleShipping.trackingNumber);
      expect(response.body.orderId).toBe(sampleShipping.orderId);
      expect(response.body.status).toBe(sampleShipping.status);
      expect(response.body.timeline).toBeDefined();
      expect(Array.isArray(response.body.timeline)).toBe(true);
    });

    test('GET /api/shipping/track/:trackingNumber should return 404 for invalid tracking number', async () => {
      await request(app)
        .get('/api/shipping/track/INVALID123')
        .expect(404);
    });

    test('PATCH /api/shipping/:id/status should update shipping status', async () => {
      const shipping = await Shipping.create(sampleShipping);

      const response = await request(app)
        .patch(`/api/shipping/${shipping.shippingId}/status`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.status).toBe('delivered');
      expect(response.body.actualDelivery).toBeDefined();
    });

    test('PATCH /api/shipping/:id/status should return 404 for non-existent shipping', async () => {
      await request(app)
        .patch('/api/shipping/NON-EXISTENT/status')
        .send({ status: 'delivered' })
        .expect(404);
    });
  });

  describe('Timeline Generation', () => {
    test('should generate timeline for processing status', async () => {
      const shipping = await Shipping.create({
        shippingId: 'SHIP-TEST001',
        orderId: 'ORDER-001',
        customerId: 'CUST001',
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zipCode: '12345',
          country: 'USA'
        },
        items: [],
        totalAmount: 99.99,
        trackingNumber: 'TRK123456789',
        status: 'processing'
      });

      const response = await request(app)
        .get(`/api/shipping/track/${shipping.trackingNumber}`)
        .expect(200);

      expect(response.body.timeline).toHaveLength(1);
      expect(response.body.timeline[0].status).toBe('processing');
    });

    test('should generate timeline for delivered status', async () => {
      const deliveryDate = new Date();
      const shipping = await Shipping.create({
        shippingId: 'SHIP-TEST001',
        orderId: 'ORDER-001',
        customerId: 'CUST001',
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zipCode: '12345',
          country: 'USA'
        },
        items: [],
        totalAmount: 99.99,
        trackingNumber: 'TRK123456789',
        status: 'delivered',
        actualDelivery: deliveryDate
      });

      const response = await request(app)
        .get(`/api/shipping/track/${shipping.trackingNumber}`)
        .expect(200);

      expect(response.body.timeline.length).toBeGreaterThan(1);
      const deliveredStep = response.body.timeline.find(step => step.status === 'delivered');
      expect(deliveredStep).toBeDefined();
      expect(deliveredStep.description).toContain('delivered successfully');
    });
  });
});