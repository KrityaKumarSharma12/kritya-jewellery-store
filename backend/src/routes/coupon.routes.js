const express = require('express');
const router = express.Router();
const { couponController } = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/auth');

// Public list
router.get('/available', couponController.getAvailableCoupons);

// Validate (needs auth so we can check per-user limits)
router.post('/validate', authenticate, couponController.validateCoupon);

module.exports = router;