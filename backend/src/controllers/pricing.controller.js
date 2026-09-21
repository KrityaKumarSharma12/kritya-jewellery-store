const { PrismaClient } = require('@prisma/client');
const cache = require('../config/cache');
const goldRateService = require('../services/goldRate.service');
const logger = require('../utils/logger');

const prisma = require('../lib/prisma');

class PricingController {
  async getProductPrice(req, res) {
    try {
      const { productId } = req.params;
      const { customerId, quantity, couponCode } = req.query;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: true,
          tags: true,
        },
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      let customerGroup = null;
      if (customerId) {
        const customer = await prisma.user.findUnique({
          where: { id: customerId },
          include: { customerGroup: true },
        });
        customerGroup = customer?.customerGroup;
      }

      const goldRate = await goldRateService.getCurrentGoldRate();
      const priceCalculation = await goldRateService.calculateProductPrice(product, goldRate);

      const finalPrice = await this.applyPriceRules({
        product,
        customerGroup,
        quantity: parseInt(quantity) || 1,
        couponCode,
        basePrice: priceCalculation.finalPrice,
      });

      const priceHistory = await prisma.dynamicPrice.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { goldRate: true },
      });

      res.json({
        currentPrice: finalPrice.price,
        breakdown: {
          basePrice: priceCalculation.basePrice,
          makingCharge: priceCalculation.makingCharge,
          profitMargin: priceCalculation.profitMargin,
          tax: priceCalculation.tax,
          discounts: finalPrice.discounts || [],
          finalPrice: finalPrice.price,
        },
        goldRate: goldRate,
        priceHistory,
        quantity: parseInt(quantity) || 1,
        total: finalPrice.price * (parseInt(quantity) || 1),
      });
    } catch (error) {
      logger.error('Get product price error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async applyPriceRules({ product, customerGroup, quantity, couponCode, basePrice }) {
    let price = basePrice;
    const discounts = [];

    if (customerGroup) {
      const groupPrice = await prisma.customerGroupPrice.findFirst({
        where: {
          groupId: customerGroup.id,
          priceRule: {
            isActive: true,
            OR: [
              { startDate: { lte: new Date() } },
              { startDate: null },
            ],
            OR: [
              { endDate: { gte: new Date() } },
              { endDate: null },
            ],
          },
        },
        include: { priceRule: true },
      });

      if (groupPrice) {
        const discount = price * (1 - groupPrice.multiplier);
        price -= discount;
        discounts.push({
          type: 'customer_group',
          name: customerGroup.name,
          amount: discount,
          percentage: (1 - groupPrice.multiplier) * 100,
        });
      }
    }

    if (quantity >= 10) {
      const bulkDiscount = price * 0.1;
      price -= bulkDiscount;
      discounts.push({
        type: 'bulk',
        name: 'Bulk Discount (10+)',
        amount: bulkDiscount,
        percentage: 10,
      });
    } else if (quantity >= 5) {
      const bulkDiscount = price * 0.05;
      price -= bulkDiscount;
      discounts.push({
        type: 'bulk',
        name: 'Bulk Discount (5+)',
        amount: bulkDiscount,
        percentage: 5,
      });
    }

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { 
          code: couponCode.toUpperCase(),
          isActive: true,
          AND: [
            { startDate: { lte: new Date() } },
            { endDate: { gte: new Date() } },
          ],
        },
      });

      if (coupon && (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)) {
        let discount = 0;
        if (coupon.type === 'PERCENTAGE') {
          discount = price * (coupon.value / 100);
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        } else if (coupon.type === 'FIXED') {
          discount = coupon.value;
        }
        
        if (!coupon.minOrder || basePrice >= coupon.minOrder) {
          price -= discount;
          discounts.push({
            type: 'coupon',
            name: coupon.code,
            amount: discount,
            percentage: coupon.type === 'PERCENTAGE' ? coupon.value : 0,
          });
        }
      }
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeString = now.toTimeString().slice(0, 5);
    
    const timeSlot = await prisma.timeSlotPrice.findFirst({
      where: {
        dayOfWeek,
        startTime: { lte: timeString },
        endTime: { gte: timeString },
        priceRule: { isActive: true },
      },
      include: { priceRule: true },
    });

    if (timeSlot && timeSlot.multiplier !== 1) {
      const timeDiscount = price * (1 - timeSlot.multiplier);
      price -= timeDiscount;
      discounts.push({
        type: 'time_slot',
        name: `${timeSlot.priceRule.name}`,
        amount: timeDiscount,
        percentage: (1 - timeSlot.multiplier) * 100,
      });
    }

    return {
      price: Math.round(price),
      discounts,
    };
  }

  async updateAllPrices(req, res) {
    try {
      const count = await goldRateService.updateAllProductPrices();
      res.json({
        message: `Updated prices for ${count} products`,
        count,
      });
    } catch (error) {
      logger.error('Update all prices error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateGoldRates(req, res) {
    try {
      const rates = await goldRateService.updateGoldRates();
      res.json({
        message: 'Gold rates updated successfully',
        rates,
      });
    } catch (error) {
      logger.error('Update gold rates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createPriceRule(req, res) {
    try {
      const { name, description, type, value, priority, conditions, customerGroups, timeSlots } = req.body;

      const priceRule = await prisma.priceRule.create({
        data: {
          name,
          description,
          type,
          value: parseFloat(value),
          priority: parseInt(priority) || 0,
          conditions: conditions || {},
          customerGroups: customerGroups?.length ? {
            create: customerGroups.map(groupId => ({
              groupId,
              multiplier: 1.0,
            })),
          } : undefined,
          timeSlots: timeSlots?.length ? {
            create: timeSlots,
          } : undefined,
        },
        include: {
          customerGroups: true,
          timeSlots: true,
        },
      });

      res.status(201).json(priceRule);
    } catch (error) {
      logger.error('Create price rule error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getPriceRules(req, res) {
    try {
      const rules = await prisma.priceRule.findMany({
        include: {
          customerGroups: { include: { group: true } },
          timeSlots: true,
        },
        orderBy: { priority: 'desc' },
      });

      res.json(rules);
    } catch (error) {
      logger.error('Get price rules error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getGoldRatesHistory(req, res) {
    try {
      const { days = 30, karat = 22 } = req.query;

      const rates = await prisma.goldRate.findMany({
        where: {
          karat: parseInt(karat),
          createdAt: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(rates);
    } catch (error) {
      logger.error('Get gold rates history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new PricingController();