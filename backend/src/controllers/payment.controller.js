const paymentService = require('../services/payment.service');

class PaymentController {
  // ============== CREATE RAZORPAY ORDER ==============
  async createRazorpayOrder(req, res) {
    try {
      const result = await paymentService.createRazorpayOrder(req.body.orderId);
      res.json(result);
    } catch (error) {
      console.error('Create Razorpay order error:', error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== VERIFY PAYMENT SIGNATURE ==============
  async verifyPayment(req, res) {
    try {
      const payment = await paymentService.verifyPayment(req.body);
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment,
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = new PaymentController();