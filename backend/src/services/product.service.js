const prisma = require('../lib/prisma');

// ============== FALLBACK GOLD RATES ==============
const FALLBACK_RATES = {
  9:  { karat: 9,  ratePerGram: 3675, purity: 37.5  },
  14: { karat: 14, ratePerGram: 5730, purity: 58.5  },
  18: { karat: 18, ratePerGram: 7350, purity: 75.0  },
  22: { karat: 22, ratePerGram: 8980, purity: 91.67 },
  24: { karat: 24, ratePerGram: 9800, purity: 99.99 },
};

// ============== WEIGHT MULTIPLIERS ==============
const SIZE_MULTIPLIERS = {
  'US 5':  0.90,
  'US 6':  1.00,
  'US 7':  1.08,
  'US 8':  1.16,
  'US 9':  1.24,
  'US 10': 1.32,
  'US 11': 1.40,
  'US 12': 1.48,
};

const KARAT_MULTIPLIERS = { 9: 0.98, 14: 0.99, 18: 1.00, 22: 1.01, 24: 1.02 };

const METAL_TYPE_MULTIPLIERS = { Yellow: 1.00, Rose: 1.00, White: 1.01 };

class ProductService {
  // ============== GET METAL RATE (from MetalRate table) ==============
  async getGoldRate(karat, metal = 'GOLD') {
    try {
      const rate = await prisma.metalRate.findFirst({
        where: {
          metal,
          karat,
          isActive: true,
          currency: 'INR',
        },
        orderBy: { effectiveAt: 'desc' },
      });

      if (rate) {
        const { toNum } = require('../lib/decimal');
        return {
          karat: rate.karat,
          purity: toNum(rate.purity),
          ratePerGram: toNum(rate.ratePerGram),
          metal: rate.metal,
        };
      }
    } catch (err) {
      console.warn('⚠️ Metal rate lookup failed:', err.message);
    }

    console.warn(`⚠️ No MetalRate row for ${metal} ${karat}K — using fallback`);
    return FALLBACK_RATES[karat] || FALLBACK_RATES[14];
  }

  // ============== SILVER RATE ==============
  async getSilverRate() {
    try {
      const rate = await prisma.metalRate.findFirst({
        where: { metal: 'SILVER', isActive: true },
        orderBy: { effectiveAt: 'desc' },
      });
      if (rate) {
        const { toNum } = require('../lib/decimal');
        return { ratePerGram: toNum(rate.ratePerGram), purity: toNum(rate.purity) };
      }
    } catch (err) {
      console.warn('⚠️ Silver rate lookup failed:', err.message);
    }
    return { ratePerGram: 120, purity: 99.9 };
  }

  // ============== PLATINUM RATE ==============
  async getPlatinumRate() {
    try {
      const rate = await prisma.metalRate.findFirst({
        where: { metal: 'PLATINUM', isActive: true },
        orderBy: { effectiveAt: 'desc' },
      });
      if (rate) {
        const { toNum } = require('../lib/decimal');
        return { ratePerGram: toNum(rate.ratePerGram), purity: toNum(rate.purity) };
      }
    } catch (err) {
      console.warn('⚠️ Platinum rate lookup failed:', err.message);
    }
    return { ratePerGram: 3500, purity: 99.95 };
  }

  // ============== GET METAL OPTIONS (for admin dropdowns) ==============
  async getMetalOptions() {
    try {
      const rows = await prisma.metalRate.findMany({
        where: { isActive: true },
        orderBy: [{ metal: 'asc' }, { karat: 'desc' }],
      });

      const { toNum } = require('../lib/decimal');

      return rows.map((r) => {
        const rate = toNum(r.ratePerGram);
        const purity = toNum(r.purity);
        const karat = r.karat || 0;

        let label;
        if (r.metal === 'GOLD' && karat > 0) {
          label = `GOLD - ${karat}K - ₹${rate.toLocaleString('en-IN')}/gm`;
        } else {
          label = `${r.metal} - ${purity}% - ₹${rate.toLocaleString('en-IN')}/gm`;
        }

        return {
          id: r.id,
          key: `${r.metal}-${karat}`,
          metal: r.metal,
          karat,
          purity,
          ratePerGram: rate,
          label,
        };
      });
    } catch (err) {
      console.error('[getMetalOptions] failed:', err.message);
      return [];
    }
  }

  // ============== GET GEMSTONE OPTIONS (for admin dropdowns) ==============
  async getGemstoneOptions() {
    try {
      const rows = await prisma.gemstoneRate.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { ratePerCarat: 'desc' }],
      });

      const { toNum } = require('../lib/decimal');

      return rows.map((r) => {
        const rate = toNum(r.ratePerCarat);
        return {
          id: r.id,
          key: r.id,
          type: r.type,
          clarity: r.clarity,
          color: r.color,
          ratePerCarat: rate,
          label: `${r.type} - ${r.clarity} - ₹${rate.toLocaleString('en-IN')}/ct - ${r.color}`,
        };
      });
    } catch (err) {
      console.error('[getGemstoneOptions] failed:', err.message);
      return [];
    }
  }

  // ============== EXTRACT WEIGHT FROM STRING ==============
  _extractWeight(weightStr, fallback = 5) {
    if (!weightStr) return fallback;
    const match = String(weightStr).match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : fallback;
  }

  // ============== CALCULATE REGULAR PRODUCT PRICE (legacy) ==============
  async calculateRegularProductPrice(product, options) {
    const { metalKarat, size, metalType, quantity } = options;

    const goldRate = await this.getGoldRate(metalKarat);
    const baseWeight = this._extractWeight(product.weight, 5);

    const sizeMultiplier = SIZE_MULTIPLIERS[size] || 1.00;
    const karatMultiplier = KARAT_MULTIPLIERS[metalKarat] || 1.00;
    const metalTypeMultiplier = METAL_TYPE_MULTIPLIERS[metalType] || 1.00;

    const goldWeight = baseWeight * sizeMultiplier * karatMultiplier * metalTypeMultiplier;

    const purityFactor = goldRate.purity / 100;
    const metalPrice = goldWeight * goldRate.ratePerGram * purityFactor;

    const productBasePrice = parseFloat(product.price) || 0;
    const baseMetalPrice = baseWeight * goldRate.ratePerGram * purityFactor;
    const otherCosts = Math.max(0, productBasePrice - baseMetalPrice);
    const weightRatio = goldWeight / baseWeight;
    const scaledOtherCosts = otherCosts * weightRatio;

    const subtotal = metalPrice + scaledOtherCosts;
    const gst = subtotal * 0.03;
    const finalPrice = subtotal + gst;
    const totalPrice = finalPrice * quantity;

    console.log('🔢 Weight calculation:', {
      baseWeight,
      size,
      sizeMultiplier,
      metalKarat,
      karatMultiplier,
      metalType,
      metalTypeMultiplier,
      finalWeight: goldWeight.toFixed(3),
      mathCheck: `${baseWeight} × ${sizeMultiplier} × ${karatMultiplier} × ${metalTypeMultiplier} = ${goldWeight.toFixed(3)}g`,
    });

    return {
      variantId: null,
      selectedOptions: { metalKarat, size, metalType, quantity },
      goldRate: {
        karat: goldRate.karat,
        ratePerGram: goldRate.ratePerGram,
        purity: goldRate.purity,
      },
      weight: {
        baseWeight,
        sizeMultiplier,
        karatMultiplier,
        metalTypeMultiplier,
        finalWeight: parseFloat(goldWeight.toFixed(3)),
        display: `${goldWeight.toFixed(2)}g`,
      },
      breakdown: {
        metal: {
          label: `Metal (${goldWeight.toFixed(2)}g ${metalKarat}KT)`,
          weight: parseFloat(goldWeight.toFixed(2)),
          weightDisplay: `${goldWeight.toFixed(2)}g`,
          amount: Math.round(metalPrice),
          amountDisplay: `₹${Math.round(metalPrice).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Weight × Rate × Purity',
            calculation: `${goldWeight.toFixed(2)}g × ₹${goldRate.ratePerGram}/g × ${purityFactor.toFixed(4)}`,
          },
        },
        diamond: {
          label: 'Diamond / Gemstone',
          amount: Math.round(scaledOtherCosts * 0.7),
          amountDisplay: `₹${Math.round(scaledOtherCosts * 0.7).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Estimated from base price',
            calculation: `₹${Math.round(scaledOtherCosts * 0.7).toLocaleString('en-IN')}`,
          },
        },
        makingWastage: {
          label: 'Making & Wastage',
          total: Math.round(scaledOtherCosts * 0.3),
          totalDisplay: `₹${Math.round(scaledOtherCosts * 0.3).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Scaling factor applied',
            calculation: `₹${Math.round(scaledOtherCosts * 0.3).toLocaleString('en-IN')}`,
          },
        },
        gst: {
          label: 'GST (3%)',
          rate: 3,
          amount: Math.round(gst),
          amountDisplay: `₹${Math.round(gst).toLocaleString('en-IN')}`,
          formula: {
            formula: '(Metal + Diamond + Making) × 3%',
            calculation: `(₹${Math.round(metalPrice).toLocaleString('en-IN')} + ₹${Math.round(scaledOtherCosts * 0.7).toLocaleString('en-IN')} + ₹${Math.round(scaledOtherCosts * 0.3).toLocaleString('en-IN')}) × 0.03`,
          },
        },
      },
      pricing: {
        subtotal: Math.round(subtotal),
        gst: Math.round(gst),
        finalPrice: Math.round(finalPrice),
        finalPriceDisplay: `₹${Math.round(finalPrice).toLocaleString('en-IN')}`,
        totalPrice: Math.round(totalPrice),
        totalPriceDisplay: `₹${Math.round(totalPrice).toLocaleString('en-IN')}`,
      },
      price: Math.round(finalPrice),
      priceDisplay: `₹${Math.round(finalPrice).toLocaleString('en-IN')}`,
    };
  }

  // ============== CALCULATE JEWELLERY PRODUCT PRICE (legacy) ==============
  async calculateJewelleryProductPrice(product, options) {
    const { metalKarat, size, metalType, quantity } = options;

    const goldRate = await this.getGoldRate(metalKarat);

    const variant =
      product.variants?.find((v) => v.metalKarat === metalKarat && v.isActive) ||
      product.variants?.[0];

    const baseWeight = parseFloat(variant?.goldWeight) || 5;

    const sizeMultiplier = SIZE_MULTIPLIERS[size] || 1.00;
    const karatMultiplier = KARAT_MULTIPLIERS[metalKarat] || 1.00;
    const metalTypeMultiplier = METAL_TYPE_MULTIPLIERS[metalType] || 1.00;

    const goldWeight = baseWeight * sizeMultiplier * karatMultiplier * metalTypeMultiplier;

    const purityFactor = goldRate.purity / 100;
    const metalPrice = goldWeight * goldRate.ratePerGram * purityFactor;

    let diamondPrice = 0;
    let diamondCarat = 0;
    if (variant?.diamondCarat) {
      diamondCarat = parseFloat(variant.diamondCarat) || 0;
      if (diamondCarat > 0) {
        let pricePerCarat = 70000;
        try {
          if (variant?.diamondId && prisma.diamond) {
            const diamond = await prisma.diamond.findUnique({
              where: { id: variant.diamondId },
            });
            if (diamond) pricePerCarat = parseFloat(diamond.pricePerCarat) || 70000;
          }
        } catch (err) {
          console.warn('Diamond lookup failed:', err.message);
        }
        diamondPrice = diamondCarat * pricePerCarat;
      }
    }

    let makingCharge = 0;
    const makingChargeValue = parseFloat(variant?.makingCharge) || 15;
    if (variant?.makingChargeType === 'PERCENTAGE') {
      makingCharge = (metalPrice + diamondPrice) * (makingChargeValue / 100);
    } else {
      makingCharge = makingChargeValue;
    }

    const wastagePercent = parseFloat(variant?.wastagePercent) || 5;
    const wastage = metalPrice * (wastagePercent / 100);

    const subtotal = metalPrice + diamondPrice + makingCharge + wastage;
    const gst = subtotal * 0.03;
    const finalPrice = subtotal + gst;
    const totalPrice = finalPrice * quantity;

    return {
      variantId: variant?.id,
      selectedOptions: { metalKarat, size, metalType, quantity },
      goldRate: {
        karat: goldRate.karat,
        ratePerGram: goldRate.ratePerGram,
        purity: goldRate.purity,
      },
      weight: {
        baseWeight,
        sizeMultiplier,
        karatMultiplier,
        metalTypeMultiplier,
        finalWeight: parseFloat(goldWeight.toFixed(3)),
        display: `${goldWeight.toFixed(2)}g`,
      },
      breakdown: {
        metal: {
          label: `Metal (${goldWeight.toFixed(2)}g ${metalKarat}KT)`,
          weight: parseFloat(goldWeight.toFixed(2)),
          weightDisplay: `${goldWeight.toFixed(2)}g`,
          amount: Math.round(metalPrice),
          amountDisplay: `₹${Math.round(metalPrice).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Weight × Rate × Purity',
            calculation: `${goldWeight.toFixed(2)}g × ₹${goldRate.ratePerGram}/g × ${purityFactor.toFixed(4)}`,
          },
        },
        diamond: {
          label: 'Diamond',
          carat: diamondCarat,
          caratDisplay: `${diamondCarat}ct`,
          amount: Math.round(diamondPrice),
          amountDisplay: `₹${Math.round(diamondPrice).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Carat × Price per carat',
            calculation: `${diamondCarat}ct × ₹70,000`,
          },
        },
        makingWastage: {
          label: 'Making & Wastage',
          making: Math.round(makingCharge),
          wastage: Math.round(wastage),
          total: Math.round(makingCharge + wastage),
          totalDisplay: `₹${Math.round(makingCharge + wastage).toLocaleString('en-IN')}`,
          formula: {
            formula: 'Making % + Wastage %',
            calculation: `${makingChargeValue}% making + ${wastagePercent}% wastage`,
          },
        },
        gst: {
          label: 'GST (3%)',
          rate: 3,
          amount: Math.round(gst),
          amountDisplay: `₹${Math.round(gst).toLocaleString('en-IN')}`,
          formula: {
            formula: '(Metal + Diamond + Making) × 3%',
            calculation: `(₹${Math.round(metalPrice).toLocaleString('en-IN')} + ₹${Math.round(diamondPrice).toLocaleString('en-IN')} + ₹${Math.round(makingCharge + wastage).toLocaleString('en-IN')}) × 0.03`,
          },
        },
      },
      pricing: {
        subtotal: Math.round(subtotal),
        gst: Math.round(gst),
        finalPrice: Math.round(finalPrice),
        finalPriceDisplay: `₹${Math.round(finalPrice).toLocaleString('en-IN')}`,
        totalPrice: Math.round(totalPrice),
        totalPriceDisplay: `₹${Math.round(totalPrice).toLocaleString('en-IN')}`,
      },
      price: Math.round(finalPrice),
      priceDisplay: `₹${Math.round(finalPrice).toLocaleString('en-IN')}`,
    };
  }

  // ============== CALCULATE VARIANT PRICE ==============
  async calculateVariantPrice(variant) {
    const metal = variant.metal || 'GOLD';
    const karat = parseInt(variant.metalKarat || variant.karat || 18, 10);
    const metalWeight = parseFloat(variant.metalWeight) || 0;
    const makingCharge = parseFloat(variant.makingChargeOverride) || 0;
    const sideDiamondWeight = parseFloat(variant.sideDiamondWeight) || 0;
    const sideDiamondPrice = parseFloat(variant.sideDiamondPrice) || 0;
    const stoneValue = parseFloat(variant.stoneValue) || 0;

    const gemstoneType = variant.gemstone || null;
    const gemstoneWeight = parseFloat(variant.gemstoneWeight) || 0;
    let gemstoneRate = 0;
    let gemstonePrice = 0;

    if (gemstoneWeight > 0 && variant.gemstoneRateId) {
      try {
        const gr = await prisma.gemstoneRate.findUnique({
          where: { id: variant.gemstoneRateId },
        });
        if (gr) {
          const { toNum } = require('../lib/decimal');
          gemstoneRate = toNum(gr.ratePerCarat);
          gemstonePrice = gemstoneWeight * gemstoneRate;
        }
      } catch (err) {
        console.warn('[calculateVariantPrice] gemstone lookup failed:', err.message);
      }
    }

    let rate;
    try {
      if (metal === 'SILVER') {
        rate = (await this.getSilverRate()).ratePerGram;
      } else if (metal === 'PLATINUM') {
        rate = (await this.getPlatinumRate()).ratePerGram;
      } else if (metal === 'WHITE_GOLD') {
        const goldRate = await this.getGoldRate(karat, 'GOLD');
        rate = goldRate.ratePerGram * 1.01;
      } else if (metal === 'ROSE_GOLD') {
        const goldRate = await this.getGoldRate(karat, 'GOLD');
        rate = goldRate.ratePerGram;
      } else {
        rate = (await this.getGoldRate(karat, 'GOLD')).ratePerGram;
      }
    } catch (err) {
      console.warn('[calculateVariantPrice] rate lookup failed:', err.message);
      rate = FALLBACK_RATES[karat]?.ratePerGram || 7350;
    }

    const metalPrice = metalWeight * rate;
    const diamondPrice = sideDiamondWeight * sideDiamondPrice;

    const subtotal = metalPrice + diamondPrice + gemstonePrice + stoneValue + makingCharge;
    const gst = subtotal * 0.03;
    const finalPrice = subtotal + gst;

    return {
      finalPrice: Math.round(finalPrice),
      breakdown: {
        metal,
        karat,
        metalPrice: Math.round(metalPrice),
        metalWeight,
        metalRate: rate,
        diamondPrice: Math.round(diamondPrice),
        sideDiamondWeight,
        sideDiamondPrice,
        gemstone: gemstoneType,
        gemstoneWeight,
        gemstoneRate,
        gemstonePrice: Math.round(gemstonePrice),
        gemstoneValue: Math.round(stoneValue),
        makingCharge: Math.round(makingCharge),
        subtotal: Math.round(subtotal),
        gst: Math.round(gst),
        finalPrice: Math.round(finalPrice),
      },
    };
  }

  // ============== VALIDATE VARIANTS ==============
  _findInvalidVariant(variants) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.metal) return `Variant ${i + 1}: metal is required`;
      if (v.metalWeight == null || v.metalWeight === '') {
        return `Variant ${i + 1}: metal weight is required`;
      }
    }
    return null;
  }

  // ============== GET ALL PRODUCTS ==============
  async getAllProducts(query) {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
      category,
      material,
      minPrice,
      maxPrice,
      inStock,
    } = query;

    const where = { isActive: true };
    const andConditions = [];

    if (category && category !== 'all') {
      const singular = category.endsWith('s') ? category.slice(0, -1) : category;
      andConditions.push({
        OR: [
          { category: { equals: category, mode: 'insensitive' } },
          { category: { equals: singular, mode: 'insensitive' } },
        ],
      });
    }

    if (material && material !== 'all') {
      const normalized = material.trim().toUpperCase().replace(/\s+/g, '_');
      andConditions.push({
        OR: [
          { material: { equals: material,     mode: 'insensitive' } },
          { material: { equals: normalized,   mode: 'insensitive' } },
        ],
      });
    }

    if (search && search.trim()) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      where.price = priceFilter;
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const orderBy = {};
    switch (sort) {
      case 'price-asc':  orderBy.price = 'asc'; break;
      case 'price-desc': orderBy.price = 'desc'; break;
      case 'latest':     orderBy.createdAt = 'desc'; break;
      default:           orderBy.createdAt = 'desc';
    }

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    let products = [];
    let total = 0;

    try {
      products = await prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          colorMedia: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          collection: true,
        },
      });
      total = await prisma.product.count({ where });
    } catch (dbError) {
      console.log('Database error:', dbError.message);
      return {
        products: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
      };
    }

    const productsWithDynamicData = products.map((product) => {
      const originalPrice = product.price * 1.2;
      return {
        ...product,
        originalPrice: Math.round(originalPrice),
        discount: Math.round(((originalPrice - product.price) / originalPrice) * 100),
        dynamicPricing: {
          metal: {
            weight: product.weight || '10g',
            material: product.material || 'Gold',
          },
          diamond: { details: 'Not specified' },
        },
      };
    });

    return {
      products: productsWithDynamicData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============== GET PRODUCT BY ID ==============
    // ============== GET PRODUCT BY ID ==============
  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        colorMedia: { orderBy: { sortOrder: 'asc' } },
        variants: {
          include: {
            gemstoneRate: true,
            diamond: true,
          },
        },
        collection: true,
      },
    });

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const { toNum } = require('../lib/decimal');

    // ⭐ Serialize variant Decimals so the frontend gets plain numbers
    if (product.variants && product.variants.length > 0) {
      product.variants = product.variants.map((v) => ({
        ...v,
        metalWeight: v.metalWeight != null ? toNum(v.metalWeight) : null,
        gemstoneWeight: v.gemstoneWeight != null ? toNum(v.gemstoneWeight) : null,
        sideDiamondPrice: v.sideDiamondPrice != null ? toNum(v.sideDiamondPrice) : null,
        sideDiamondWeight: v.sideDiamondWeight != null ? toNum(v.sideDiamondWeight) : null,
        makingChargeOverride: v.makingChargeOverride != null ? toNum(v.makingChargeOverride) : null,
        beadsWeight: v.beadsWeight != null ? toNum(v.beadsWeight) : null,
        stoneSubtractWeight: v.stoneSubtractWeight != null ? toNum(v.stoneSubtractWeight) : null,
        stoneValue: v.stoneValue != null ? toNum(v.stoneValue) : null,
        customOrderPremiumValue: v.customOrderPremiumValue != null ? toNum(v.customOrderPremiumValue) : null,
        calculatedPrice: v.calculatedPrice != null ? toNum(v.calculatedPrice) : null,
        // Nested relations
        gemstoneRate: v.gemstoneRate
          ? {
              ...v.gemstoneRate,
              ratePerCarat: toNum(v.gemstoneRate.ratePerCarat),
            }
          : null,
        diamond: v.diamond
          ? {
              ...v.diamond,
              carat: toNum(v.diamond.carat),
              pricePerCarat: toNum(v.diamond.pricePerCarat),
            }
          : null,
      }));
    }

    const finalPrice = product.price;
    const originalPrice = product.price * 1.2;

    let goldRate = null;
    let ratePerGram = 9800;
    try {
      const latestRate = await prisma.metalRate.findFirst({
        where: { metal: 'GOLD', isActive: true },
        orderBy: { effectiveAt: 'desc' },
      });
      if (latestRate) {
        ratePerGram = toNum(latestRate.ratePerGram);
        goldRate = {
          ratePerGram,
          karat: latestRate.karat,
          purity: toNum(latestRate.purity),
          currency: latestRate.currency,
        };
      }
    } catch (rateError) {
      console.log('Could not fetch metal rate:', rateError.message);
    }

    const basePriceWithoutGST = finalPrice / 1.03;
    const gst = finalPrice - basePriceWithoutGST;

    const diamondCost = basePriceWithoutGST * 0.10;
    const makingWastage = basePriceWithoutGST * 0.20;

    const metalCost = basePriceWithoutGST - diamondCost - makingWastage;
    const goldWeight = metalCost / ratePerGram;

    const breakdown = {
      metal: {
        weight: `${goldWeight.toFixed(2)}g`,
        karat: goldRate?.karat || 22,
        amount: metalCost,
        amountDisplay: `₹${metalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      },
      diamond: {
        details: '10% of Base Cost',
        amount: diamondCost,
        amountDisplay: `₹${diamondCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      },
      makingWastage: {
        total: makingWastage,
        totalDisplay: `₹${makingWastage.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      },
      gst: {
        amount: gst,
        amountDisplay: `₹${gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      },
      grandTotal: finalPrice,
      grandTotalDisplay: `₹${finalPrice.toLocaleString('en-IN')}`,
      goldRate,
    };

    const similarProducts = await prisma.product.findMany({
      where: { id: { not: id }, category: product.category, isActive: true },
      take: 4,
      include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
    });

    return {
      ...product,
      originalPrice: Math.round(originalPrice),
      discount: Math.round(((originalPrice - product.price) / originalPrice) * 100),
      breakdown,
      goldRate,
      similarProducts: similarProducts.map((p) => ({
        ...p,
        price: p.price,
        originalPrice: Math.round(p.price * 1.2),
      })),
    };
  }

  // ============== CALCULATE DYNAMIC PRICE ==============
  async calculateDynamicPrice(productId, query) {
    const { metalKarat, size, metalColor, metalType, quantity = 1 } = query;

    console.log('🔥 calculate-price:', { productId, metalKarat, size, metalColor, metalType, quantity });

    // ⭐ Load product WITH variants + relations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          include: {
            gemstoneRate: true,
            diamond: true,
          },
        },
        colorMedia: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    // ⭐ PATH 1: product has variants → use variant-based pricing
    if (product.variants && product.variants.length > 0) {
      const { toNum } = require('../lib/decimal');

      const requestedKarat = parseInt(metalKarat, 10) || null;
      const requestedColor = metalColor || metalType || null;
      const requestedSize = size || null;

      let variant = product.variants.find((v) =>
        (!requestedKarat || v.metalKarat === requestedKarat) &&
        (!requestedColor || v.metalColor === requestedColor) &&
        (!requestedSize || v.productSize === requestedSize)
      );

      if (!variant && requestedKarat) {
        variant = product.variants.find((v) => v.metalKarat === requestedKarat);
      }

      if (!variant) {
        variant = product.variants.find((v) => v.isDefault) || product.variants[0];
      }

      if (variant) {
        console.log('✅ Variant found:', variant.id, '| karat:', variant.metalKarat);

        const variantForCalc = {
          metal: variant.metal,
          metalKarat: variant.metalKarat,
          metalWeight: toNum(variant.metalWeight),
          metalColor: variant.metalColor,
          productSize: variant.productSize,
          gemstone: variant.gemstone,
          gemstoneWeight: toNum(variant.gemstoneWeight),
          gemstoneRateId: variant.gemstoneRateId,
          sideDiamondWeight: toNum(variant.sideDiamondWeight),
          sideDiamondPrice: toNum(variant.sideDiamondPrice),
          makingChargeOverride: toNum(variant.makingChargeOverride),
          stoneValue: toNum(variant.stoneValue),
          diamondId: variant.diamondId,
          numberOfDiamonds: variant.numberOfDiamonds,
          numberOfSideDiamonds: variant.numberOfSideDiamonds,
        };

        const qty = parseInt(quantity, 10) || 1;
        const pricing = await this.calculateVariantPrice(variantForCalc);

        const unitPrice = pricing.finalPrice;
        const totalPrice = unitPrice * qty;

        const metalRate = await this.getGoldRate(variant.metalKarat, variant.metal || 'GOLD');
        const gemstoneRateAmount = variant.gemstoneRate
          ? toNum(variant.gemstoneRate.ratePerCarat)
          : 0;

        console.log('💰 Price:', `₹${unitPrice.toLocaleString('en-IN')}`);

        return {
          variantId: variant.id,
          selectedOptions: {
            metalKarat: variant.metalKarat,
            size: variant.productSize,
            metalColor: variant.metalColor,
            quantity: qty,
          },
          goldRate: {
            karat: variant.metalKarat,
            ratePerGram: metalRate.ratePerGram,
            purity: metalRate.purity,
          },
          weight: {
            baseWeight: toNum(variant.metalWeight),
            sizeMultiplier: 1,
            karatMultiplier: 1,
            metalTypeMultiplier: 1,
            finalWeight: toNum(variant.metalWeight),
            display: `${toNum(variant.metalWeight).toFixed(2)}g`,
          },
          breakdown: {
            metal: {
              label: `Metal (${toNum(variant.metalWeight).toFixed(2)}g ${variant.metalKarat}KT)`,
              weight: toNum(variant.metalWeight),
              weightDisplay: `${toNum(variant.metalWeight).toFixed(2)}g`,
              amount: pricing.breakdown.metalPrice,
              amountDisplay: `₹${pricing.breakdown.metalPrice.toLocaleString('en-IN')}`,
              formula: {
                formula: 'Weight × Rate',
                calculation: `${toNum(variant.metalWeight).toFixed(2)}g × ₹${pricing.breakdown.metalRate}/g`,
              },
            },
            diamond: {
              label: 'Diamond',
              carat: toNum(variant.sideDiamondWeight),
              caratDisplay: `${toNum(variant.sideDiamondWeight)}ct`,
              amount: pricing.breakdown.diamondPrice,
              amountDisplay: `₹${pricing.breakdown.diamondPrice.toLocaleString('en-IN')}`,
              formula: {
                formula: 'Carat × Price/carat',
                calculation: `${toNum(variant.sideDiamondWeight)}ct × ₹${toNum(variant.sideDiamondPrice)}/ct`,
              },
            },
            gemstone: {
              label: `${variant.gemstone || 'Gemstone'}`,
              carat: toNum(variant.gemstoneWeight),
              caratDisplay: `${toNum(variant.gemstoneWeight)}ct`,
              amount: pricing.breakdown.gemstonePrice,
              amountDisplay: `₹${pricing.breakdown.gemstonePrice.toLocaleString('en-IN')}`,
              formula: {
                formula: 'Carat × Price/carat',
                calculation: `${toNum(variant.gemstoneWeight)}ct × ₹${gemstoneRateAmount}/ct`,
              },
            },
            makingWastage: {
              label: 'Making Charge',
              making: pricing.breakdown.makingCharge,
              wastage: 0,
              total: pricing.breakdown.makingCharge,
              totalDisplay: `₹${pricing.breakdown.makingCharge.toLocaleString('en-IN')}`,
              formula: {
                formula: 'Override',
                calculation: `₹${pricing.breakdown.makingCharge}`,
              },
            },
            gst: {
              label: 'GST (3%)',
              rate: 3,
              amount: pricing.breakdown.gst,
              amountDisplay: `₹${pricing.breakdown.gst.toLocaleString('en-IN')}`,
              formula: {
                formula: '(Metal + Diamond + Gemstone + Making) × 3%',
                calculation: `(₹${pricing.breakdown.metalPrice} + ₹${pricing.breakdown.diamondPrice} + ₹${pricing.breakdown.gemstonePrice} + ₹${pricing.breakdown.makingCharge}) × 0.03`,
              },
            },
          },
          pricing: {
            subtotal: pricing.breakdown.subtotal,
            gst: pricing.breakdown.gst,
            finalPrice: unitPrice,
            finalPriceDisplay: `₹${unitPrice.toLocaleString('en-IN')}`,
            totalPrice,
            totalPriceDisplay: `₹${totalPrice.toLocaleString('en-IN')}`,
          },
          price: unitPrice,
          priceDisplay: `₹${unitPrice.toLocaleString('en-IN')}`,
        };
      }
    }

    // PATH 2: no variants → legacy pricing
    console.log('✅ Regular Product found:', product.name);
    const options = {
      metalKarat: parseInt(metalKarat) || 14,
      size: size || 'US 6',
      metalType: metalColor || metalType || 'Rose',
      quantity: parseInt(quantity) || 1,
    };
    const result = await this.calculateRegularProductPrice(product, options);
    console.log('💰 Price:', result.priceDisplay);
    return result;
  }

  // ============== CREATE PRODUCT ==============
  async createProduct(body) {
    const { name, description, price, category, material, weight, images, stock } = body;

    return prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price) || 0,
        category: category || 'Jewellery',
        material: material || '',
        weight: weight || '',
        images: images || [],
        stock: parseInt(stock) || 0,
        isActive: true,
      },
    });
  }

  // ============== CREATE PRODUCT WITH VARIANTS (PREMIUM) ==============
  async createProductWithVariants(body) {
    const {
      name,
      jewelleryType,
      productSizing,
      productStyle,
      collectionId,
      occasion,
      description,
      variants = [],
      sku,
      gst,
      returnPolicy,
      note,
      continueSelling,
      shippingLength,
      shippingWidth,
      shippingHeight,
      screwOptions = [],
      colorMedia = [],
      metaTitle,
      metaDescription,
      metaKeywords = [],
      isBestSeller,
      isFastDelivery,
      tags = [],
    } = body;

    if (!name || !name.trim()) {
      const err = new Error('Product title is required');
      err.statusCode = 400;
      throw err;
    }

    if (!variants || variants.length === 0) {
      const err = new Error('At least one variant is required');
      err.statusCode = 400;
      throw err;
    }

    const invalid = this._findInvalidVariant(variants);
    if (invalid) {
      const err = new Error(invalid);
      err.statusCode = 400;
      throw err;
    }

    const finalSku = sku || `JWL-${Date.now().toString(36).toUpperCase()}`;

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: name.trim(),
          description: description || '',
          price: 0,
          category: jewelleryType || 'Jewellery',
          material: variants[0]?.metal || 'Gold',
          weight: variants[0]?.metalWeight ? `${variants[0].metalWeight}g` : '5g',
          stock: 0,
          isActive: true,
          productSizing,
          productStyle,
          collectionId: collectionId || null,
          occasion,
          gst: gst ? parseFloat(gst) : 3.0,
          returnPolicy,
          note,
          continueSelling: continueSelling === true,
          shippingLength: shippingLength ? parseFloat(shippingLength) : null,
          shippingWidth: shippingWidth ? parseFloat(shippingWidth) : null,
          shippingHeight: shippingHeight ? parseFloat(shippingHeight) : null,
          metaTitle,
          metaDescription,
          metaKeywords: metaKeywords || [],
          isBestSeller: isBestSeller === true,
          isFastDelivery: isFastDelivery === true,
          tags: tags || [],
        },
      });

      let totalStock = 0;
      let firstVariantPrice = 0;

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const pricing = await this.calculateVariantPrice(v);
        if (i === 0) firstVariantPrice = pricing.finalPrice;

        const variantData = {
          product: { connect: { id: newProduct.id } },
          metal: v.metal,
          metalKarat: v.metalKarat || 18,
          metalWeight: parseFloat(v.metalWeight) || 0,
          metalColor: v.metalColor || 'Yellow',
          productSize: v.productSize || null,
          gemstone: v.gemstone || null,
          gemstoneWeight: v.gemstoneWeight ? parseFloat(v.gemstoneWeight) : null,
          numberOfDiamonds: v.numberOfDiamonds ? parseInt(v.numberOfDiamonds) : 0,
          numberOfSideDiamonds: v.numberOfSideDiamonds ? parseInt(v.numberOfSideDiamonds) : 0,
          sideDiamondPrice: v.sideDiamondPrice ? parseFloat(v.sideDiamondPrice) : null,
          sideDiamondWeight: v.sideDiamondWeight ? parseFloat(v.sideDiamondWeight) : null,
          sideDiamondQuality: v.sideDiamondQuality || null,
          karigar: v.karigar || null,
          makingChargeWeightRange: v.makingChargeWeightRange || null,
          makingChargeOverride: v.makingChargeOverride ? parseFloat(v.makingChargeOverride) : null,
          beadsWeight: v.beadsWeight ? parseFloat(v.beadsWeight) : null,
          stoneSubtractWeight: v.stoneSubtractWeight ? parseFloat(v.stoneSubtractWeight) : null,
          stoneValue: v.stoneValue ? parseFloat(v.stoneValue) : null,
          customOrderPremiumType: v.customOrderPremiumType || 'None',
          customOrderPremiumValue: v.customOrderPremiumValue ? parseFloat(v.customOrderPremiumValue) : null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || `${finalSku}-${v.metal}-${v.metalColor}-${i + 1}`,
          calculatedPrice: pricing.finalPrice,
          pricingBreakdown: pricing.breakdown,
          isActive: true,
          isDefault: i === 0,
        };

        if (v.diamondId) {
          variantData.diamond = { connect: { id: v.diamondId } };
        }

        if (v.gemstoneRateId) {
          variantData.gemstoneRate = { connect: { id: v.gemstoneRateId } };
        }

        await tx.productVariant.create({ data: variantData });

        totalStock += parseInt(v.stock) || 0;
      }

      await tx.product.update({
        where: { id: newProduct.id },
        data: { price: firstVariantPrice, stock: totalStock },
      });

      for (const screw of screwOptions) {
        if (!screw.screwType) continue;
        await tx.screwOption.create({
          data: {
            product: { connect: { id: newProduct.id } },
            screwType: screw.screwType,
            screwMaterial: screw.screwMaterial || '',
            notes: screw.notes || null,
          },
        });
      }

      for (let i = 0; i < colorMedia.length; i++) {
        const m = colorMedia[i];
        await tx.colorMedia.create({
          data: {
            product: { connect: { id: newProduct.id } },
            color: m.color,
            url: m.url,
            type: m.type || 'image',
            isPrimary: i === 0,
            sortOrder: i,
          },
        });
      }

      for (const v of variants) {
        if (v.makingChargeRules && v.makingChargeRules.length > 0) {
          for (const rule of v.makingChargeRules) {
            await tx.pricingRule.create({
              data: {
                product: { connect: { id: newProduct.id } },
                ruleType: 'making_charge',
                weightFrom: parseFloat(rule.weightFrom) || null,
                weightTo: parseFloat(rule.weightTo) || null,
                value: parseFloat(rule.value) || 0,
                valueType: rule.valueType || 'percent',
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          variants: true,
          screwOptions: true,
          colorMedia: true,
          collection: true,
          pricingRules: true,
        },
      });
    });

    return product;
  }

  // ============== UPDATE PRODUCT WITH VARIANTS (PREMIUM) ==============
  async updateProductWithVariants(id, body) {
    const {
      name,
      jewelleryType,
      productSizing,
      productStyle,
      collectionId,
      occasion,
      description,
      variants = [],
      sku,
      gst,
      returnPolicy,
      note,
      continueSelling,
      shippingLength,
      shippingWidth,
      shippingHeight,
      screwOptions = [],
      colorMedia = [],
      metaTitle,
      metaDescription,
      metaKeywords = [],
      isBestSeller,
      isFastDelivery,
      tags = [],
    } = body;

    if (!name || !name.trim()) {
      const err = new Error('Product title is required');
      err.statusCode = 400;
      throw err;
    }

    if (!variants || variants.length === 0) {
      const err = new Error('At least one variant is required');
      err.statusCode = 400;
      throw err;
    }

    const invalid = this._findInvalidVariant(variants);
    if (invalid) {
      const err = new Error(invalid);
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const finalSku = sku || existing.sku || `JWL-${Date.now().toString(36).toUpperCase()}`;

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description || '',
          category: jewelleryType || 'Jewellery',
          material: variants[0]?.metal || existing.material,
          weight: variants[0]?.metalWeight ? `${variants[0].metalWeight}g` : existing.weight,
          productSizing,
          productStyle,
          collectionId: collectionId || null,
          occasion,
          gst: gst ? parseFloat(gst) : 3.0,
          returnPolicy,
          note,
          continueSelling: continueSelling === true,
          shippingLength: shippingLength ? parseFloat(shippingLength) : null,
          shippingWidth: shippingWidth ? parseFloat(shippingWidth) : null,
          shippingHeight: shippingHeight ? parseFloat(shippingHeight) : null,
          metaTitle,
          metaDescription,
          metaKeywords: metaKeywords || [],
          isBestSeller: isBestSeller === true,
          isFastDelivery: isFastDelivery === true,
          tags: tags || [],
        },
      });

      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.screwOption.deleteMany({ where: { productId: id } });
      await tx.colorMedia.deleteMany({ where: { productId: id } });
      await tx.pricingRule.deleteMany({ where: { productId: id } });

      let totalStock = 0;
      let firstVariantPrice = 0;

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const pricing = await this.calculateVariantPrice(v);
        if (i === 0) firstVariantPrice = pricing.finalPrice;

        const variantData = {
          product: { connect: { id } },
          metal: v.metal,
          metalKarat: v.metalKarat || 18,
          metalWeight: parseFloat(v.metalWeight) || 0,
          metalColor: v.metalColor || 'Yellow',
          productSize: v.productSize || null,
          gemstone: v.gemstone || null,
          gemstoneWeight: v.gemstoneWeight ? parseFloat(v.gemstoneWeight) : null,
          numberOfDiamonds: v.numberOfDiamonds ? parseInt(v.numberOfDiamonds) : 0,
          numberOfSideDiamonds: v.numberOfSideDiamonds ? parseInt(v.numberOfSideDiamonds) : 0,
          sideDiamondPrice: v.sideDiamondPrice ? parseFloat(v.sideDiamondPrice) : null,
          sideDiamondWeight: v.sideDiamondWeight ? parseFloat(v.sideDiamondWeight) : null,
          sideDiamondQuality: v.sideDiamondQuality || null,
          karigar: v.karigar || null,
          makingChargeWeightRange: v.makingChargeWeightRange || null,
          makingChargeOverride: v.makingChargeOverride ? parseFloat(v.makingChargeOverride) : null,
          beadsWeight: v.beadsWeight ? parseFloat(v.beadsWeight) : null,
          stoneSubtractWeight: v.stoneSubtractWeight ? parseFloat(v.stoneSubtractWeight) : null,
          stoneValue: v.stoneValue ? parseFloat(v.stoneValue) : null,
          customOrderPremiumType: v.customOrderPremiumType || 'None',
          customOrderPremiumValue: v.customOrderPremiumValue ? parseFloat(v.customOrderPremiumValue) : null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || `${finalSku}-${v.metal}-${v.metalColor}-${i + 1}`,
          calculatedPrice: pricing.finalPrice,
          pricingBreakdown: pricing.breakdown,
          isActive: true,
          isDefault: i === 0,
        };

        if (v.diamondId) {
          variantData.diamond = { connect: { id: v.diamondId } };
        }

        if (v.gemstoneRateId) {
          variantData.gemstoneRate = { connect: { id: v.gemstoneRateId } };
        }

        await tx.productVariant.create({ data: variantData });

        totalStock += parseInt(v.stock) || 0;
      }

      await tx.product.update({
        where: { id },
        data: { price: firstVariantPrice, stock: totalStock },
      });

      for (const screw of screwOptions) {
        if (!screw.screwType) continue;
        await tx.screwOption.create({
          data: {
            product: { connect: { id } },
            screwType: screw.screwType,
            screwMaterial: screw.screwMaterial || '',
            notes: screw.notes || null,
          },
        });
      }

      for (let i = 0; i < colorMedia.length; i++) {
        const m = colorMedia[i];
        await tx.colorMedia.create({
          data: {
            product: { connect: { id } },
            color: m.color,
            url: m.url,
            type: m.type || 'image',
            isPrimary: i === 0,
            sortOrder: i,
          },
        });
      }

      for (const v of variants) {
        if (v.makingChargeRules && v.makingChargeRules.length > 0) {
          for (const rule of v.makingChargeRules) {
            await tx.pricingRule.create({
              data: {
                product: { connect: { id } },
                ruleType: 'making_charge',
                weightFrom: parseFloat(rule.weightFrom) || null,
                weightTo: parseFloat(rule.weightTo) || null,
                value: parseFloat(rule.value) || 0,
                valueType: rule.valueType || 'percent',
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          variants: true,
          screwOptions: true,
          colorMedia: true,
          collection: true,
          pricingRules: true,
        },
      });
    });

    return product;
  }

  // ============== UPDATE PRODUCT (SIMPLE) ==============
  async updateProduct(id, updates) {
    return prisma.product.update({ where: { id }, data: updates });
  }

  // ============== DELETE PRODUCT ==============
  async deleteProduct(id) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}

module.exports = new ProductService();