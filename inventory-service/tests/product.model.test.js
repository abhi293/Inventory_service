const mongoose = require('mongoose');
const Product = require('../src/models/Product');

describe('Product Model', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/inventory_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Product.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('should create a valid product', async () => {
    const productData = {
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      quantity: 50,
      sku: 'TEST123'
    };

    const product = new Product(productData);
    const savedProduct = await product.save();

    expect(savedProduct._id).toBeDefined();
    expect(savedProduct.name).toBe(productData.name);
    expect(savedProduct.sku).toBe(productData.sku);
    expect(savedProduct.createdAt).toBeDefined();
    expect(savedProduct.updatedAt).toBeDefined();
  });

  test('should fail validation for missing required fields', async () => {
    const product = new Product({});

    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.price).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
    expect(error.errors.sku).toBeDefined();
  });

  test('should fail validation for negative price', async () => {
    const product = new Product({
      name: 'Test Product',
      price: -10,
      quantity: 5,
      sku: 'TEST123'
    });

    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.price).toBeDefined();
  });

  test('should fail validation for negative quantity', async () => {
    const product = new Product({
      name: 'Test Product',
      price: 99.99,
      quantity: -5,
      sku: 'TEST123'
    });

    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
  });

  test('should enforce unique SKU constraint', async () => {
    const productData = {
      name: 'Test Product',
      price: 99.99,
      quantity: 10,
      sku: 'DUPLICATE'
    };

    // Create first product
    await Product.create(productData);

    // Try to create second product with same SKU
    let error;
    try {
      await Product.create(productData);
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  test('should trim whitespace from name', async () => {
    const product = new Product({
      name: '  Whitespace Product  ',
      price: 99.99,
      quantity: 10,
      sku: 'WS001'
    });

    const savedProduct = await product.save();
    expect(savedProduct.name).toBe('Whitespace Product');
  });
});