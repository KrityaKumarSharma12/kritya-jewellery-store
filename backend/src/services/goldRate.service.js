const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default gold rates (will be updated from API or manual)
const DEFAULT_GOLD_RATES = {
  24: { karat: 24, purity: 99.99, ratePerGram: 9800 },
  22: { karat: 22, purity: 91.67, ratePerGram: 8980 },
  18: { karat: 18, purity: 75.00, ratePerGram: 7350 },
  14: { karat: 14, purity: 58.50, ratePerGram: 5730 },
};

class GoldRateService {
  constructor() {
    this.currentRates = { ...DEFAULT_GOLD_RATES };
  }

  // Get current gold rate for a specific karat
  async getGoldRate(karat = 24) {
    try {
      // Try to get from database first
      const dbRate = await prisma.goldRate.findFirst({
        where: { 
          karat, 
          isActive: true,
          currency: 'INR',
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbRate) {
        return dbRate;
      }

      // Fallback to default rates
      return this.getDefaultRate(karat);
    } catch (error) {
      console.error('Error fetching gold rate:', error);
      return this.getDefaultRate(karat);
    }
  }

  getDefaultRate(karat) {
    const rate = DEFAULT_GOLD_RATES[karat];
    if (!rate) return DEFAULT_GOLD_RATES[24];
    return {
      karat: rate.karat,
      purity: rate.purity,
      ratePerGram: rate.ratePerGram,
      currency: 'INR',
    };
  }

  // Calculate metal price for a variant
  calculateMetalPrice(variant, goldRate) {
    const { metalType, purity, netWeight, grossWeight } = variant;
    
    const weight = parseFloat(netWeight || grossWeight || 0);
    const karat = this.extractKarat(purity) || 22;
    const ratePerGram = goldRate?.ratePerGram || DEFAULT_GOLD_RATES[karat]?.ratePerGram || 9800;
    const purityValue = this.getPurityValue(karat);
    const metalPrice = weight * ratePerGram * (purityValue / 24);
    
    return {
      weight,
      karat,
      purity: purityValue,
      ratePerGram,
      metalPrice: Math.round(metalPrice * 100) / 100,
    };
  }

  // Calculate diamond price
  calculateDiamondPrice(variant) {
    const { diamondWeight, diamondPieces, diamondDetails } = variant;
    
    if (!diamondWeight || diamondWeight === 0) {
      return { diamondPrice: 0, pricePerCarat: 0 };
    }

    const baseRatePerCarat = 50000;
    let pricePerCarat = baseRatePerCarat;

    if (diamondDetails) {
      const details = typeof diamondDetails === 'string' ? JSON.parse(diamondDetails) : diamondDetails;
      const clarityPremium = this.getClarityPremium(details.clarity);
      const colorPremium = this.getColorPremium(details.color);
      pricePerCarat = baseRatePerCarat * (1 + clarityPremium + colorPremium);
    }

    const diamondPrice = parseFloat(diamondWeight) * pricePerCarat;

    return {
      diamondPrice: Math.round(diamondPrice * 100) / 100,
      pricePerCarat: Math.round(pricePerCarat * 100) / 100,
      diamondWeight: parseFloat(diamondWeight),
      diamondPieces: diamondPieces || 0,
    };
  }

  // Calculate making charge
  calculateMakingCharge(variant, metalPrice) {
    const { makingChargeType, makingCharge, wastagePercent } = variant;
    
    let makingChargeAmount = 0;
    let wastageAmount = 0;

    if (makingChargeType === 'PERCENTAGE') {
      makingChargeAmount = metalPrice * (parseFloat(makingCharge) / 100);
    } else {
      makingChargeAmount = parseFloat(makingCharge) || 0;
    }

    if (wastagePercent) {
      wastageAmount = metalPrice * (parseFloat(wastagePercent) / 100);
    }

    return {
      makingCharge: Math.round(makingChargeAmount * 100) / 100,
      wastage: Math.round(wastageAmount * 100) / 100,
      total: Math.round((makingChargeAmount + wastageAmount) * 100) / 100,
    };
  }

  // Calculate final price for a variant
  async calculateVariantPrice(variant) {
    const karat = this.extractKarat(variant.purity) || 22;
    const goldRate = await this.getGoldRate(karat);

    // 2. Calculate metal price
    const metalPriceData = this.calculateMetalPrice(variant, goldRate);

    // 3. Calculate diamond price
    const diamondPriceData = this.calculateDiamondPrice(variant);

    // 4. Calculate making charge
    const makingChargeData = this.calculateMakingCharge(variant, metalPriceData.metalPrice);

    // 5. Calculate final price
    const subtotal = metalPriceData.metalPrice + makingChargeData.total + diamondPriceData.diamondPrice;
    const gst = subtotal * 0.03;
    const finalPrice = subtotal + gst;

    return {
      metalPrice: metalPriceData.metalPrice,
      makingCharge: makingChargeData.total,
      diamondPrice: diamondPriceData.diamondPrice,
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      goldRate: goldRate,
      breakdown: {
        'Metal Price': Math.round(metalPriceData.metalPrice * 100) / 100,
        'Making Charge': Math.round(makingChargeData.total * 100) / 100,
        'Diamond Price': Math.round(diamondPriceData.diamondPrice * 100) / 100,
        'Subtotal': Math.round(subtotal * 100) / 100,
        'GST (3%)': Math.round(gst * 100) / 100,
        'Total': Math.round(finalPrice * 100) / 100,
      },
    };
  }

  extractKarat(purity) {
    if (!purity) return null;
    const match = String(purity).match(/(\d+)[Kk]/);
    if (match) return parseInt(match[1]);
    return null;
  }

  getPurityValue(karat) {
    const purityMap = {
      24: 99.99,
      22: 91.67,
      18: 75.00,
      14: 58.50,
      10: 41.70,
    };
    return purityMap[karat] || 91.67;
  }

  getClarityPremium(clarity) {
    const premiums = {
      'IF': 0.50,
      'VVS1': 0.40,
      'VVS2': 0.30,
      'VS1': 0.20,
      'VS2': 0.10,
      'SI1': 0.00,
      'SI2': -0.10,
    };
    return premiums[clarity] || 0;
  }

  getColorPremium(color) {
    const premiums = {
      'D': 0.40,
      'E': 0.30,
      'F': 0.20,
      'G': 0.10,
      'H': 0.00,
      'I': -0.10,
      'J': -0.20,
    };
    return premiums[color] || 0;
  }

  // Update gold rates (admin)
  async updateGoldRates(rates) {
    const updatedRates = [];
    for (const [karat, data] of Object.entries(rates)) {
      const rate = await prisma.goldRate.upsert({
        where: {
          karat_currency: {
            karat: parseInt(karat),
            currency: 'INR',
          },
        },
        update: {
          ratePerGram: parseFloat(data.ratePerGram),
          purity: parseFloat(data.purity),
          source: 'MANUAL',
          updatedAt: new Date(),
        },
        create: {
          karat: parseInt(karat),
          purity: parseFloat(data.purity),
          ratePerGram: parseFloat(data.ratePerGram),
          currency: 'INR',
          source: 'MANUAL',
          isActive: true,
        },
      });
      updatedRates.push(rate);
    }
    return updatedRates;
  }
}

module.exports = new GoldRateService();