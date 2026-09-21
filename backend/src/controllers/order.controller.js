const orderService = require('../services/order.service');

// ============== CREATE ORDER ==============
exports.createOrder = async (req, res) => {
  try {
    const result = await orderService.createOrder({
      userId: req.user.id,
      userEmail: req.user.email,
      shippingAddress: req.body.shippingAddress,
      phone: req.body.phone,
      paymentMethod: req.body.paymentMethod,
      couponCode: req.body.couponCode,
      notes: req.body.notes,
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: result.order,
      summary: result.summary,
    });
  } catch (error) {
    console.error('Create order error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== GET USER ORDERS ==============
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await orderService.getUserOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== GET ORDER BY ID ==============
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== CANCEL ORDER ==============
exports.cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancelOrder(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== CREATE RETURN (customer-initiated) ==============
exports.createReturn = async (req, res) => {
  try {
    const { items, reason, notes } = req.body;

    const returnRequest = await orderService.createReturn(
      req.params.id,
      req.user.id,
      { items, reason, notes }
    );

    res.status(201).json({
      message: 'Return request submitted successfully',
      return: returnRequest,
    });
  } catch (error) {
    console.error('Create return error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== GET USER RETURNS ==============
exports.getUserReturns = async (req, res) => {
  try {
    const returns = await orderService.getUserReturns(req.user.id);
    res.json(returns);
  } catch (error) {
    console.error('Get user returns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};