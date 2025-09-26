const testProducts = [
  {
    name: 'Gaming Laptop',
    description: 'High-performance gaming laptop with RTX graphics',
    price: 1899.99,
    quantity: 5,
    sku: 'GAM-LAP-001',
    category: 'Electronics'
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: 49.99,
    quantity: 25,
    sku: 'WIR-MOU-002',
    category: 'Accessories'
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with blue switches',
    price: 129.99,
    quantity: 15,
    sku: 'MEC-KEY-003',
    category: 'Accessories'
  },
  {
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with 4K HDMI output',
    price: 79.99,
    quantity: 20,
    sku: 'USB-HUB-004',
    category: 'Accessories'
  },
  {
    name: 'External Monitor',
    description: '27-inch 4K external monitor',
    price: 399.99,
    quantity: 8,
    sku: 'EXT-MON-005',
    category: 'Electronics'
  }
];

const testCustomers = [
  {
    customerId: 'CUST001',
    customerName: 'John Doe',
    customerEmail: 'john.doe@email.com',
    shippingAddress: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'NY',
      zipCode: '12345',
      country: 'USA'
    }
  },
  {
    customerId: 'CUST002',
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@email.com',
    shippingAddress: {
      street: '456 Oak Avenue',
      city: 'Springfield',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    }
  },
  {
    customerId: 'CUST003',
    customerName: 'Bob Johnson',
    customerEmail: 'bob.johnson@email.com',
    shippingAddress: {
      street: '789 Pine Road',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA'
    }
  }
];

module.exports = {
  testProducts,
  testCustomers
};