const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/product/:productId/price', pricingController.getProductPrice);
router.get('/gold-rates/history', pricingController.getGoldRatesHistory);

// Admin routes
router.post('/admin/update-prices', authenticate, isAdmin, pricingController.updateAllPrices);
router.post('/admin/update-gold-rates', authenticate, isAdmin, pricingController.updateGoldRates);
router.post('/admin/price-rules', authenticate, isAdmin, pricingController.createPriceRule);
router.get('/admin/price-rules', authenticate, isAdmin, pricingController.getPriceRules);

module.exports = router;