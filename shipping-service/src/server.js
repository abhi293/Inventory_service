const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const shippingRoutes = require('./routes/shipping');
const swaggerSetup = require('./config/swagger');
const messageQueue = require('./services/messageQueue');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Swagger setup
swaggerSetup(app);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipping', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Initialize message queue
messageQueue.connect();

// Routes
app.use('/api/shipping', shippingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'shipping-service' });
});

app.listen(PORT, () => {
  console.log(`Shipping Service running on port ${PORT}`);
});

module.exports = app;