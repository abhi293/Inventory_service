const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const Shipping = require('../models/Shipping');

class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'order-events';
    this.queue = 'shipping-queue';
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      await this.channel.assertQueue(this.queue, { durable: true });
      
      // Bind queue to exchange with routing key
      await this.channel.bindQueue(this.queue, this.exchange, 'order.created');
      
      // Set up consumer
      await this.channel.consume(this.queue, this.handleOrderEvent.bind(this), {
        noAck: false
      });
      
      console.log('Connected to RabbitMQ and listening for order events');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
    }
  }

  async handleOrderEvent(message) {
    try {
      const content = JSON.parse(message.content.toString());
      console.log('Received order event:', content.data.orderId);

      // Create shipping record
      const shippingRecord = await this.createShippingRecord(content.data);
      
      // Acknowledge message
      this.channel.ack(message);
      
      console.log(`Created shipping record: ${shippingRecord.shippingId}`);
    } catch (error) {
      console.error('Error processing order event:', error.message);
      // Reject message and requeue
      this.channel.nack(message, false, true);
    }
  }

  async createShippingRecord(orderData) {
    const shippingId = `SHIP-${uuidv4().substring(0, 8).toUpperCase()}`;
    const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    
    // Calculate estimated delivery (5-7 business days)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 5);

    const shipping = new Shipping({
      shippingId,
      orderId: orderData.orderId,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      shippingAddress: orderData.shippingAddress,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      status: 'processing',
      trackingNumber,
      estimatedDelivery,
      carrier: 'Standard Shipping'
    });

    await shipping.save();
    
    // Simulate automatic status progression
    setTimeout(() => this.updateShippingStatus(shippingId, 'shipped'), 60000); // 1 minute
    
    return shipping;
  }

  async updateShippingStatus(shippingId, status) {
    try {
      const shipping = await Shipping.findOne({ shippingId });
      if (shipping) {
        shipping.status = status;
        await shipping.save();
        console.log(`Updated shipping ${shippingId} status to ${status}`);
      }
    } catch (error) {
      console.error('Error updating shipping status:', error.message);
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = new MessageQueue();