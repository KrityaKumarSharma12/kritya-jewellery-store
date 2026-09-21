const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class JewelleryPricingService {
  // Get current gold rate
  async getGoldRate(karat = 18) {
    try {
      const rate = await prisma.goldRate.findFirst({
        where: {
          karat,
          currency: 'INR',
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (rate) return rate;

      // Fallback rates if not found in DB
      const fallbackRates = {
        9: { karat: 9, purity: 37.5, ratePerGram: 3675 },
        14: { karat: 14, purity: 58.5, ratePerGram: 5730 },
        18: { karat: 18, purity: 75.0, ratePerGram: 7350 },
        22: { karat: 22, purity: 91.67, ratePerGram: 8980 },
        24: { karat: 24, purity: 99.99, ratePerGram: 9800 },
      };

      return fallbackRates[karat] || fallbackRates[18];
    } catch (error) {
      console.error('Error fetching gold rate:', error);
      return { karat: 18, purity: 75.0, ratePerGram: 7350 };
    }
  }

  // Get diamond price
  async getDiamondPrice(diamondId) {
    try {
      if (!diamondId) return null;
      
      const diamond = await prisma.diamond.findUnique({
        where: { id: diamondId, isActive: true },
      });

      return diamond;
    } catch (error) {
      console.error('Error fetching diamond:', error);
      return null;
    }
  }

  // Calculate full price for a jewellery variant
  async calculateVariantPrice(variant) {
    try {
      // 1. Get gold rate
      const goldRate = await this.getGoldRate(variant.metalKarat || 18);
      
      // 2. Calculate metal price
      // Metal Price = Gold Weight × Gold Rate × (Purity/100)
      const goldWeight = parseFloat(variant.goldWeight) || 0;
      const purity = goldRate.purity / 100;
      const metalPrice = goldWeight * goldRate.ratePerGram * purity;

      // 3. Calculate diamond price
      let diamondPrice = 0;
      let diamondDetails = null;
      
      if (variant.diamondId) {
        const diamond = await this.getDiamondPrice(variant.diamondId);
        if (diamond) {
          const carat = parseFloat(variant.diamondCarat) || parseFloat(diamond.carat) || 0;
          const pricePerCarat = parseFloat(diamond.pricePerCarat) || 0;
          diamondPrice = carat * pricePerCarat;
          diamondDetails = {
            shape: diamond.shape || variant.diamondShape,
            color: diamond.color || variant.diamondColor,
            clarity: diamond.clarity || variant.diamondClarity,
            cut: diamond.cut || variant.diamondCut,
            carat: carat,
            pricePerCarat: pricePerCarat,
          };
        }
      } else if (variant.diamondCarat) {
        // Fallback diamond pricing
        const baseRatePerCarat = 70000;
        const carat = parseFloat(variant.diamondCarat) || 0;
        diamondPrice = carat * baseRatePerCarat;
        diamondDetails = {
          shape: variant.diamondShape || 'Round',
          color: variant.diamondColor || 'F',
          clarity: variant.diamondClarity || 'VS1',
          cut: variant.diamondCut || 'Excellent',
          carat: carat,
          pricePerCarat: baseRatePerCarat,
        };
      }

      // 4. Calculate making charge
      let makingCharge = 0;
      const totalBasePrice = metalPrice + diamondPrice;
      
      if (variant.makingChargeType === 'PERCENTAGE') {
        makingCharge = totalBasePrice * (parseFloat(variant.makingCharge) / 100);
      } else {
        makingCharge = parseFloat(variant.makingCharge) || 0;
      }

      // 5. Calculate wastage
      let wastage = 0;
      if (variant.wastagePercent) {
        wastage = metalPrice * (parseFloat(variant.wastagePercent) / 100);
      }

      // 6. Calculate subtotal
      const subtotal = metalPrice + diamondPrice + makingCharge + wastage;

      // 7. Calculate GST (3%)
      const gst = subtotal * 0.03;

      // 8. Final price
      const finalPrice = subtotal + gst;

      // 9. Build breakdown matching the screenshot
      const breakdown = {
        'Metal': {
          weight: `${goldWeight}g`,
          rate: `₹${goldRate.ratePerGram}/g`,
          purity: `${goldRate.purity}%`,
          amount: Math.round(metalPrice),
        },
        'Diamond / Gemstone': {
          details: diamondDetails ? 
            `${diamondDetails.shape} · ${diamondDetails.clarity || 'VVS-VS'}` : 
            'No diamond',
          carat: diamondDetails?.carat || 0,
          amount: Math.round(diamondPrice),
        },
        'Making & Wastage': {
          making: Math.round(makingCharge),
          wastage: Math.round(wastage),
          amount: Math.round(makingCharge + wastage),
        },
        'GST (3%)': Math.round(gst),
        'Grand Total': Math.round(finalPrice),
      };

      return {
        metalPrice: Math.round(metalPrice),
        diamondPrice: Math.round(diamondPrice),
        makingCharge: Math.round(makingCharge),
        wastage: Math.round(wastage),
        subtotal: Math.round(subtotal),
        gst: Math.round(gst),
        finalPrice: Math.round(finalPrice),
        goldRate: goldRate,
        diamondDetails: diamondDetails,
        breakdown: breakdown,
        formula: {
          metalPrice: `${goldWeight}g × ₹${goldRate.ratePerGram} × ${(goldRate.purity/100).toFixed(4)} = ₹${Math.round(metalPrice)}`,
          diamondPrice: diamondPrice > 0 ? `${diamondDetails?.carat || 0}ct × ₹${diamondDetails?.pricePerCarat || 0} = ₹${Math.round(diamondPrice)}` : 'No diamond',
          makingCharge: variant.makingChargeType === 'PERCENTAGE' ? 
            `${variant.makingCharge}% of base = ₹${Math.round(makingCharge)}` : 
            `Fixed ₹${Math.round(makingCharge)}`,
          wastage: wastage > 0 ? `${variant.wastagePercent}% of metal = ₹${Math.round(wastage)}` : 'No wastage',
        },
      };
    } catch (error) {
      console.error('Error calculating variant price:', error);
      throw error;
    }
  }

  // Get product with all variants and prices
  async getProductWithPrices(productId) {
    try {
      const product = await prisma.jewelleryProduct.findUnique({
        where: { id: productId, isActive: true },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { metalKarat: 'asc' },
          },
        },
      });

      if (!product) return null;

      // Calculate prices for all variants
      const variantsWithPrices = await Promise.all(
        product.variants.map(async (variant) => {
          const priceData = await this.calculateVariantPrice(variant);
          return {
            ...variant,
            priceData,
          };
        })
      );

      return {
        ...product,
        variants: variantsWithPrices,
        defaultVariant: variantsWithPrices.find(v => v.isDefault) || variantsWithPrices[0],
      };
    } catch (error) {
      console.error('Error getting product with prices:', error);
      throw error;
    }
  }
}

module.exports = new JewelleryPricingService();