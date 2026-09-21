const prisma = require('../lib/prisma');
const { toNum } = require('../lib/decimal');

// ============================================================
// COUPON LOGIC HELPERS
// ============================================================

function calculateDiscount(coupon, subtotal) {
  const value = toNum(coupon.value);
  const maxDiscount = coupon.maxDiscount != null ? toNum(coupon.maxDiscount) : null;

  let discount = 0;

  if (coupon.type === 'PERCENTAGE') {
    discount = (subtotal * value) / 100;
    if (maxDiscount != null && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else if (coupon.type === 'FIXED') {
    discount = value;
  } else if (coupon.type === 'FREE_SHIPPING') {
    discount = 0;
  }

  if (discount > subtotal) discount = subtotal;
  return Math.round(discount * 100) / 100;
}

function isCouponAvailable(coupon, now = new Date()) {
  if (!coupon.isActive) return { ok: false, reason: 'This coupon is not active' };
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { ok: false, reason: 'This coupon is not yet available' };
  }
  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return { ok: false, reason: 'This coupon has expired' };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: 'This coupon has reached its usage limit' };
  }
  return { ok: true };
}

// ============================================================
// SERVICE
// ============================================================

class CouponService {
  // ============== LIST PUBLICLY-AVAILABLE COUPONS ==============
  async getAvailableCoupons() {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return coupons
      .filter((c) => {
        if (c.usageLimit != null && c.usedCount >= c.usageLimit) return false;
        return true;
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        type: c.type,
        value: toNum(c.value),
        maxDiscount: c.maxDiscount != null ? toNum(c.maxDiscount) : null,
        minOrder: c.minOrder != null ? toNum(c.minOrder) : null,
        startDate: c.startDate,
        endDate: c.endDate,
        isGlobal: c.isGlobal,
      }));
  }

  // ============== VALIDATE / APPLY A COUPON ==============
  async validateCoupon({ code, subtotal, userId }) {
    if (!code || typeof code !== 'string') {
      const err = new Error('Coupon code is required');
      err.statusCode = 400;
      throw err;
    }

    const subtotalNum = parseFloat(subtotal);
    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      const err = new Error('Invalid subtotal');
      err.statusCode = 400;
      throw err;
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      const err = new Error('Invalid coupon code');
      err.statusCode = 404;
      throw err;
    }

    const avail = isCouponAvailable(coupon);
    if (!avail.ok) {
      const err = new Error(avail.reason);
      err.statusCode = 400;
      throw err;
    }

    const minOrder = coupon.minOrder != null ? toNum(coupon.minOrder) : null;
    if (minOrder != null && subtotalNum < minOrder) {
      const err = new Error(
        `Minimum order of ₹${minOrder.toLocaleString('en-IN')} required for this coupon`
      );
      err.statusCode = 400;
      throw err;
    }

    if (userId && coupon.perUserLimit != null) {
      const userUsageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        const err = new Error('You have already used this coupon the maximum number of times');
        err.statusCode = 400;
        throw err;
      }
    }

    const discount = calculateDiscount(coupon, subtotalNum);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: toNum(coupon.value),
        maxDiscount: coupon.maxDiscount != null ? toNum(coupon.maxDiscount) : null,
        minOrder,
        isGlobal: coupon.isGlobal,
      },
      discount,
      freeShipping: coupon.type === 'FREE_SHIPPING',
    };
  }

  // ============== FETCH A COUPON BY CODE (for order.service) ==============
  async findCouponByCode(code) {
    if (!code || typeof code !== 'string' || !code.trim()) return null;
    return prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  // ============== COUNT PER-USER USAGE (for order.service) ==============
  async countUserUsage(couponId, userId) {
    return prisma.couponUsage.count({ where: { couponId, userId } });
  }
}

const instance = new CouponService();
instance.calculateDiscount = calculateDiscount;
instance.isCouponAvailable = isCouponAvailable;

module.exports = instance;
module.exports.calculateDiscount = calculateDiscount;
module.exports.isCouponAvailable = isCouponAvailable;