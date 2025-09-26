const mongoose = require('mongoose');

const shippingSchema = new mongoose.Schema({
  shippingId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'shipped', 'in-transit', 'delivered', 'failed'],
    default: 'processing'
  },
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  carrier: {
    type: String,
    default: 'Standard Shipping'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shipping', shippingSchema);