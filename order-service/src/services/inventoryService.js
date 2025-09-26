const axios = require('axios');

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3001';

class InventoryService {
  async checkAvailability(items) {
    try {
      const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/products/check-availability`, {
        items
      });
      return response.data;
    } catch (error) {
      throw new Error(`Inventory service error: ${error.message}`);
    }
  }

  async updateQuantity(productId, quantityChange) {
    try {
      // First get current product
      const productResponse = await axios.get(`${INVENTORY_SERVICE_URL}/api/products/${productId}`);
      const currentQuantity = productResponse.data.quantity;
      const newQuantity = currentQuantity + quantityChange;

      // Update quantity
      const response = await axios.patch(`${INVENTORY_SERVICE_URL}/api/products/${productId}/quantity`, {
        quantity: newQuantity
      });
      return response.data;
    } catch (error) {
      throw new Error(`Inventory update error: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();