const axios = require('axios');

// Create test products before running order tests
async function createTestProducts(context, events, done) {
  try {
    // Create a few test products for orders
    const products = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await axios.post('http://localhost:3001/api/products', {
        name: `Load Test Product ${Date.now()}-${i}`,
        description: `Product for load testing ${i}`,
        price: Math.floor(Math.random() * 900) + 100,
        quantity: Math.floor(Math.random() * 100) + 50,
        sku: `LOAD-${Date.now()}-${i}`
      });
      
      products.push({
        productId: response.data._id,
        quantity: Math.floor(Math.random() * 5) + 1
      });
    }
    
    context.vars.items = products;
    return done();
  } catch (error) {
    console.error('Error creating test products:', error.message);
    return done(error);
  }
}

module.exports = {
  createTestProducts
};