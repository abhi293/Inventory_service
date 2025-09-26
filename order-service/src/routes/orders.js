const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const inventoryService = require('../services/inventoryService');
const messageQueue = require('../services/messageQueue');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - customerId
 *         - customerName
 *         - customerEmail
 *         - items
 *         - shippingAddress
 *       properties:
 *         orderId:
 *           type: string
 *         customerId:
 *           type: string
 *         customerName:
 *           type: string
 *         customerEmail:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *         totalAmount:
 *           type: number
 *         status:
 *           type: string
 *         shippingAddress:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, customerEmail, items, shippingAddress } = req.body;
    
    // Check inventory availability
    const availability = await inventoryService.checkAvailability(items);
    
    if (!availability.available) {
      return res.status(400).json({ 
        error: 'Some items are not available', 
        details: availability.items.filter(item => !item.available)
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];
    
    for (const availableItem of availability.items) {
      const requestedItem = items.find(item => item.productId === availableItem.productId);
      const itemTotal = availableItem.product.price * requestedItem.quantity;
      
      orderItems.push({
        productId: availableItem.productId,
        productName: availableItem.product.name,
        quantity: requestedItem.quantity,
        price: availableItem.product.price,
        totalPrice: itemTotal
      });
      
      totalAmount += itemTotal;
    }

    // Create order
    const order = new Order({
      orderId: uuidv4(),
      customerId,
      customerName,
      customerEmail,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: 'confirmed'
    });

    await order.save();

    // Update inventory quantities
    for (const item of items) {
      await inventoryService.updateQuantity(item.productId, -item.quantity);
    }

    // Send order event to shipping service
    await messageQueue.publishOrderEvent({
      orderId: order.orderId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Generate invoice for an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice generated
 */
router.get('/:id/invoice', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const invoice = {
      invoiceId: `INV-${order.orderId}`,
      orderId: order.orderId,
      customerInfo: {
        id: order.customerId,
        name: order.customerName,
        email: order.customerEmail
      },
      items: order.items,
      subtotal: order.totalAmount,
      tax: order.totalAmount * 0.1, // 10% tax
      total: order.totalAmount * 1.1,
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      shippingAddress: order.shippingAddress
    };

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;