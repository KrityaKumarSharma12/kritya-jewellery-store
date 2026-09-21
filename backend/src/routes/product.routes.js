const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// ⭐ IMPORT THE AUTH MIDDLEWARE
const { authenticate, isAdmin } = require('../middleware/auth');

// ============== PUBLIC ROUTES ==============

// Get all products
router.get('/', productController.getAllProducts);

// ⭐ DYNAMIC PRICE — MUST BE BEFORE /:id ⭐
router.get('/:productId/calculate-price', productController.calculateDynamicPrice);

// Get single product
router.get('/:id', productController.getProductById);

// ============== ADMIN ROUTES ==============

// Premium create with variants
router.post('/premium', authenticate, isAdmin, productController.createProductWithVariants);

// Standard create
router.post('/', authenticate, isAdmin, productController.createProduct);

// ⭐ PREMIUM UPDATE — handles variants, media, screw options ⭐
router.put('/:id/premium', authenticate, isAdmin, productController.updateProductWithVariants);

// Standard update — scalar fields only
router.put('/:id', authenticate, isAdmin, productController.updateProductWithVariants);

// Delete product
router.delete('/:id', authenticate, isAdmin, productController.deleteProduct);

module.exports = router;