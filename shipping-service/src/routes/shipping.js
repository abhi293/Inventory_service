const express = require('express');
const Shipping = require('../models/Shipping');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Shipping:
 *       type: object
 *       properties:
 *         shippingId:
 *           type: string
 *         orderId:
 *           type: string
 *         customerId:
 *           type: string
 *         customerName:
 *           type: string
 *         customerEmail:
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
 *         status:
 *           type: string
 *         trackingNumber:
 *           type: string
 *         estimatedDelivery:
 *           type: string
 *         carrier:
 *           type: string
 */

/**
 * @swagger
 * /api/shipping:
 *   get:
 *     summary: Get all shipping records
 *     responses:
 *       200:
 *         description: List of shipping records
 */
router.get('/', async (req, res) => {
  try {
    const shippings = await Shipping.find().sort({ createdAt: -1 });
    res.json(shippings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/shipping/{id}:
 *   get:
 *     summary: Get shipping record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping record details
 *       404:
 *         description: Shipping record not found
 */
router.get('/:id', async (req, res) => {
  try {
    const shipping = await Shipping.findOne({ shippingId: req.params.id });
    if (!shipping) {
      return res.status(404).json({ error: 'Shipping record not found' });
    }
    res.json(shipping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/shipping/order/{orderId}:
 *   get:
 *     summary: Get shipping record by order ID
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping record details
 *       404:
 *         description: Shipping record not found
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const shipping = await Shipping.findOne({ orderId: req.params.orderId });
    if (!shipping) {
      return res.status(404).json({ error: 'Shipping record not found for this order' });
    }
    res.json(shipping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/shipping/track/{trackingNumber}:
 *   get:
 *     summary: Track shipment by tracking number
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking information
 *       404:
 *         description: Tracking number not found
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const shipping = await Shipping.findOne({ trackingNumber: req.params.trackingNumber });
    if (!shipping) {
      return res.status(404).json({ error: 'Tracking number not found' });
    }

    const trackingInfo = {
      trackingNumber: shipping.trackingNumber,
      orderId: shipping.orderId,
      status: shipping.status,
      estimatedDelivery: shipping.estimatedDelivery,
      actualDelivery: shipping.actualDelivery,
      carrier: shipping.carrier,
      shippingAddress: shipping.shippingAddress,
      timeline: generateTimeline(shipping)
    };

    res.json(trackingInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/shipping/{id}/status:
 *   patch:
 *     summary: Update shipping status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const shipping = await Shipping.findOne({ shippingId: req.params.id });
    
    if (!shipping) {
      return res.status(404).json({ error: 'Shipping record not found' });
    }

    shipping.status = status;
    
    // Set actual delivery date if delivered
    if (status === 'delivered' && !shipping.actualDelivery) {
      shipping.actualDelivery = new Date();
    }

    await shipping.save();
    res.json(shipping);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function generateTimeline(shipping) {
  const timeline = [];
  
  timeline.push({
    status: 'processing',
    date: shipping.createdAt,
    description: 'Order received and processing started'
  });

  if (shipping.status === 'shipped' || shipping.status === 'in-transit' || shipping.status === 'delivered') {
    timeline.push({
      status: 'shipped',
      date: shipping.updatedAt,
      description: `Package shipped with ${shipping.carrier}`
    });
  }

  if (shipping.status === 'in-transit' || shipping.status === 'delivered') {
    timeline.push({
      status: 'in-transit',
      date: shipping.updatedAt,
      description: 'Package is in transit'
    });
  }

  if (shipping.status === 'delivered' && shipping.actualDelivery) {
    timeline.push({
      status: 'delivered',
      date: shipping.actualDelivery,
      description: 'Package delivered successfully'
    });
  }

  return timeline;
}

module.exports = router;