const couponService = require('../services/coupon.service');

class CouponController {
  // ============== LIST PUBLICLY-AVAILABLE COUPONS ==============
  async getAvailableCoupons(req, res) {
    try {
      const coupons = await couponService.getAvailableCoupons();
      res.json(coupons);
    } catch (error) {
      console.error('Get available coupons error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== VALIDATE / APPLY A COUPON ==============
  async validateCoupon(req, res) {
    try {
      const result = await couponService.validateCoupon({
        code: req.body.code,
        subtotal: req.body.subtotal,
        userId: req.user?.id,
      });
      res.json(result);
    } catch (error) {
      console.error('Validate coupon error:', error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = { couponController: new CouponController() };