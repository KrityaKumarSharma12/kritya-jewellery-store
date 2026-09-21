const productService = require('../services/product.service');

class ProductController {
  // ============== GET ALL PRODUCTS ==============
  async getAllProducts(req, res) {
    try {
      const result = await productService.getAllProducts(req.query);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({
        message: 'Server error',
        error: error.message,
        products: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    }
  }

  // ============== GET PRODUCT BY ID ==============
  async getProductById(req, res) {
    try {
      const product = await productService.getProductById(req.params.id);
      return res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== GET VARIANT PRICE ==============
  async getVariantPrice(req, res) {
    try {
      const result = await productService.getVariantPrice(req.params.variantId);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching variant price:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== CALCULATE DYNAMIC PRICE ==============
  async calculateDynamicPrice(req, res) {
    try {
      const result = await productService.calculateDynamicPrice(
        req.params.productId,
        req.query
      );
      return res.json(result);
    } catch (error) {
      console.error('❌ Calculate dynamic price error:', error);
      console.error('Stack:', error.stack);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== CREATE PRODUCT ==============
  async createProduct(req, res) {
    try {
      const product = await productService.createProduct(req.body);
      return res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== PREMIUM: CREATE PRODUCT WITH VARIANTS ==============
  async createProductWithVariants(req, res) {
    try {
      const product = await productService.createProductWithVariants(req.body);
      res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (error) {
      console.error('Create product error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== PREMIUM: UPDATE PRODUCT WITH VARIANTS ==============
  async updateProductWithVariants(req, res) {
    try {
      const product = await productService.updateProductWithVariants(req.params.id, req.body);
      res.json({ message: 'Product updated successfully', product });
    } catch (error) {
      console.error('Update product error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== UPDATE PRODUCT ==============
  async updateProduct(req, res) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      return res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== DELETE PRODUCT ==============
  async deleteProduct(req, res) {
    try {
      await productService.deleteProduct(req.params.id);
      return res.json({ message: 'Product deactivated successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = new ProductController();