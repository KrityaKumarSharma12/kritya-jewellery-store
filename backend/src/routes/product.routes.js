const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

//  IMPORT THE AUTH MIDDLEWARE
const { authenticate, isAdmin } = require('../middleware/auth');

// ============== PUBLIC ROUTES ==============

// Get all products
router.get('/', productController.getAllProducts);

// DYNAMIC PRICE (legacy — kept for backward compatibility)
router.get('/:productId/calculate-price', productController.calculateDynamicPrice);

// ✅ NEW: Dynamic product config structure (for size selectors)
router.get('/:id/dynamic-config', productController.getDynamicConfig);

// ✅ NEW: Dynamic product price preview (for live price updates)
router.post('/:id/price-preview', productController.previewDynamicPrice);

// Get single product
router.get('/:id', productController.getProductById);

// ============== ADMIN ROUTES ==============

// Premium create with variants
router.post('/premium', authenticate, isAdmin, productController.createProductWithVariants);

// Standard create
router.post('/', authenticate, isAdmin, productController.createProduct);

// PREMIUM UPDATE — handles variants, media, screw options
router.put('/:id/premium', authenticate, isAdmin, productController.updateProductWithVariants);

// Standard update — scalar fields only
router.put('/:id', authenticate, isAdmin, productController.updateProductWithVariants);

// Delete product
router.delete('/:id', authenticate, isAdmin, productController.deleteProduct);

module.exports = router;