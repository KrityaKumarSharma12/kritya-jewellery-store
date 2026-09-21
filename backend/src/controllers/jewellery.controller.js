const jewelleryService = require('../services/jewellery.service');

class JewelleryController {
  // Get all jewellery products with pagination and filters
  async getAllProducts(req, res) {
    try {
      const result = await jewelleryService.getAllProducts(req.query);
      res.json(result);
    } catch (error) {
      console.error('Error fetching jewellery products:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get single product with complete pricing breakdown
  async getProductById(req, res) {
    try {
      const product = await jewelleryService.getProductById(req.params.id);
      res.json(product);
    } catch (error) {
      console.error('Error fetching jewellery product:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get variant price breakdown (for dynamic updates)
  async getVariantPrice(req, res) {
    try {
      const response = await jewelleryService.getVariantPrice(req.params.variantId);
      res.json(response);
    } catch (error) {
      console.error('Error fetching variant price:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Update gold rates (admin)
  async updateGoldRates(req, res) {
    try {
      const updatedRates = await jewelleryService.updateGoldRates(req.body.rates || {});
      res.json({ message: 'Gold rates updated successfully', rates: updatedRates });
    } catch (error) {
      console.error('Error updating gold rates:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get all gold rates
  async getGoldRates(req, res) {
    try {
      const rates = await jewelleryService.getGoldRates();
      res.json(rates);
    } catch (error) {
      console.error('Error fetching gold rates:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = new JewelleryController();