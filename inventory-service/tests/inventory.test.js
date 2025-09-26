const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const Product = require('../src/models/Product');

describe('Inventory Service', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/inventory_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clean database before each test
    await Product.deleteMany({});
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'inventory-service'
      });
    });
  });

  describe('Product Management', () => {
    const sampleProduct = {
      name: 'Test Laptop',
      description: 'High-performance test laptop',
      price: 999.99,
      quantity: 10,
      sku: 'TEST001'
    };

    test('POST /api/products should create a new product', async () => {
      const response = await request(app)
        .post('/api/products')
        .send(sampleProduct)
        .expect(201);

      expect(response.body.name).toBe(sampleProduct.name);
      expect(response.body.sku).toBe(sampleProduct.sku);
      expect(response.body.price).toBe(sampleProduct.price);
      expect(response.body.quantity).toBe(sampleProduct.quantity);
      expect(response.body._id).toBeDefined();
    });

    test('POST /api/products should fail with duplicate SKU', async () => {
      // Create first product
      await request(app)
        .post('/api/products')
        .send(sampleProduct)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/products')
        .send(sampleProduct)
        .expect(400);
    });

    test('GET /api/products should return all products', async () => {
      // Create test products
      await Product.create(sampleProduct);
      await Product.create({
        ...sampleProduct,
        name: 'Test Mouse',
        sku: 'TEST002'
      });

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    test('GET /api/products/:id should return specific product', async () => {
      const product = await Product.create(sampleProduct);

      const response = await request(app)
        .get(`/api/products/${product._id}`)
        .expect(200);

      expect(response.body.name).toBe(sampleProduct.name);
      expect(response.body._id).toBe(product._id.toString());
    });

    test('GET /api/products/:id should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);
    });

    test('PUT /api/products/:id should update product', async () => {
      const product = await Product.create(sampleProduct);
      const updateData = { name: 'Updated Laptop', price: 1299.99 };

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.price).toBe(updateData.price);
    });

    test('PATCH /api/products/:id/quantity should update quantity', async () => {
      const product = await Product.create(sampleProduct);
      const newQuantity = 25;

      const response = await request(app)
        .patch(`/api/products/${product._id}/quantity`)
        .send({ quantity: newQuantity })
        .expect(200);

      expect(response.body.quantity).toBe(newQuantity);
    });
  });

  describe('Availability Check', () => {
    test('POST /api/products/check-availability should check product availability', async () => {
      const product1 = await Product.create({
        name: 'Product 1',
        sku: 'P001',
        price: 100,
        quantity: 10
      });

      const product2 = await Product.create({
        name: 'Product 2', 
        sku: 'P002',
        price: 200,
        quantity: 5
      });

      const checkItems = [
        { productId: product1._id, quantity: 5 },
        { productId: product2._id, quantity: 3 }
      ];

      const response = await request(app)
        .post('/api/products/check-availability')
        .send({ items: checkItems })
        .expect(200);

      expect(response.body.available).toBe(true);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].available).toBe(true);
      expect(response.body.items[1].available).toBe(true);
    });

    test('POST /api/products/check-availability should detect insufficient quantity', async () => {
      const product = await Product.create({
        name: 'Product 1',
        sku: 'P001', 
        price: 100,
        quantity: 5
      });

      const checkItems = [
        { productId: product._id, quantity: 10 } // More than available
      ];

      const response = await request(app)
        .post('/api/products/check-availability')
        .send({ items: checkItems })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.items[0].available).toBe(false);
      expect(response.body.items[0].reason).toBe('Insufficient quantity');
    });

    test('POST /api/products/check-availability should detect non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const checkItems = [
        { productId: fakeId, quantity: 1 }
      ];

      const response = await request(app)
        .post('/api/products/check-availability')
        .send({ items: checkItems })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.items[0].available).toBe(false);
      expect(response.body.items[0].reason).toBe('Product not found');
    });
  });
});