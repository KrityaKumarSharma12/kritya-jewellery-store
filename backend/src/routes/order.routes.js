const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ============== ORDERS ==============
router.get('/', orderController.getUserOrders);
router.post('/', orderController.createOrder);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);

// ============== RETURNS ==============
// ⭐ Customer initiates a return on a delivered order
router.post('/:id/return', orderController.createReturn);

// ⭐ Customer lists all their own returns
router.get('/returns/mine', orderController.getUserReturns);

module.exports = router;