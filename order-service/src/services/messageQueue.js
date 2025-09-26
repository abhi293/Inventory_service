const amqp = require('amqplib');

class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'order-events';
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      // In production, you might want to implement retry logic
    }
  }

  async publishOrderEvent(orderData) {
    if (!this.channel) {
      console.warn('RabbitMQ not connected, skipping message publish');
      return;
    }

    try {
      const routingKey = 'order.created';
      const message = {
        type: 'ORDER_CREATED',
        timestamp: new Date().toISOString(),
        data: orderData
      };

      await this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      console.log(`Published order event for order: ${orderData.orderId}`);
    } catch (error) {
      console.error('Failed to publish order event:', error.message);
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = new MessageQueue();