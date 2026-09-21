const express = require('express');
const router = express.Router();
const jewelleryController = require('../controllers/jewellery.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', jewelleryController.getAllProducts);
router.get('/gold-rates', jewelleryController.getGoldRates);
router.get('/:id', jewelleryController.getProductById);
router.get('/variant/:variantId/price', jewelleryController.getVariantPrice);

// Admin routes
router.post('/admin/gold-rates', authenticate, isAdmin, jewelleryController.updateGoldRates);

module.exports = router;