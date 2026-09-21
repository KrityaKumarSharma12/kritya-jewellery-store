const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');

// All payment routes require login
router.post('/create-order', authenticate, paymentController.createRazorpayOrder);
router.post('/verify', authenticate, paymentController.verifyPayment);

module.exports = router;