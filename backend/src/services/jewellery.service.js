const prisma = require('../lib/prisma');
const jewelleryPricingService = require('./jewelleryPricing.service');

class JewelleryService {
  // ============== GET ALL JEWELLERY PRODUCTS ==============
  async getAllProducts(query) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      gender,
      metalKarat,
      minPrice,
      maxPrice,
      isBestseller,
      isGifting,
    } = query;

    const where = { isActive: true };

    if (category) where.category = category;
    if (gender) where.gender = gender;
    if (isBestseller === 'true') where.isBestseller = true;
    if (isGifting === 'true') where.isGifting = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (metalKarat) {
      where.variants = { some: { metalKarat: parseInt(metalKarat) } };
    }

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const products = await prisma.jewelleryProduct.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          orderBy: { metalKarat: 'asc' },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const variantsWithPrices = await Promise.all(
          product.variants.map(async (variant) => {
            const priceData = await jewelleryPricingService.calculateVariantPrice(variant);
            return { ...variant, priceData };
          })
        );

        const defaultVariant = variantsWithPrices.find((v) => v.isDefault) || variantsWithPrices[0];

        return {
          ...product,
          variants: variantsWithPrices,
          price: defaultVariant?.priceData?.finalPrice || 0,
          originalPrice: Math.round((defaultVariant?.priceData?.finalPrice || 0) * 1.2),
          discount: 0,
        };
      })
    );

    const total = await prisma.jewelleryProduct.count({ where });

    let filteredProducts = productsWithPrices;
    if (minPrice) {
      filteredProducts = filteredProducts.filter((p) => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filteredProducts = filteredProducts.filter((p) => p.price <= parseFloat(maxPrice));
    }

    return {
      products: filteredProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============== GET PRODUCT BY ID ==============
  async getProductById(id) {
    const product = await jewelleryPricingService.getProductWithPrices(id);

    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const similarProducts = await prisma.jewelleryProduct.findMany({
      where: {
        id: { not: id },
        category: product.category,
        isActive: true,
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, take: 1 },
      },
      take: 4,
    });

    const similarWithPrices = await Promise.all(
      similarProducts.map(async (p) => {
        const variant = p.variants[0];
        if (variant) {
          const priceData = await jewelleryPricingService.calculateVariantPrice(variant);
          return { ...p, price: priceData.finalPrice };
        }
        return p;
      })
    );

    return { ...product, similarProducts: similarWithPrices };
  }

  // ============== GET VARIANT PRICE ==============
  async getVariantPrice(variantId) {
    const variant = await prisma.jewelleryVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (!variant) {
      const err = new Error('Variant not found');
      err.statusCode = 404;
      throw err;
    }

    const priceData = await jewelleryPricingService.calculateVariantPrice(variant);

    return {
      variantId: variant.id,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        images: variant.product.images || [],
      },
      price: priceData.finalPrice,
      priceDisplay: `₹${priceData.finalPrice.toLocaleString()}`,
      breakdown: {
        metal: {
          weight: variant.goldWeight,
          weightDisplay: `${variant.goldWeight}g`,
          amount: priceData.metalPrice,
          amountDisplay: `₹${priceData.metalPrice.toLocaleString()}`,
        },
        diamond: {
          details: priceData.diamondDetails
            ? `${priceData.diamondDetails.shape} · ${priceData.diamondDetails.clarity}`
            : 'No diamond',
          carat: priceData.diamondDetails?.carat || 0,
          amount: priceData.diamondPrice,
          amountDisplay: `₹${priceData.diamondPrice.toLocaleString()}`,
        },
        makingWastage: {
          making: priceData.makingCharge,
          wastage: priceData.wastage,
          total: priceData.makingCharge + priceData.wastage,
          totalDisplay: `₹${(priceData.makingCharge + priceData.wastage).toLocaleString()}`,
        },
        gst: {
          percentage: 3,
          amount: priceData.gst,
          amountDisplay: `₹${priceData.gst.toLocaleString()}`,
        },
        grandTotal: priceData.finalPrice,
        grandTotalDisplay: `₹${priceData.finalPrice.toLocaleString()}`,
      },
      goldRate: priceData.goldRate,
      diamondDetails: priceData.diamondDetails,
      formula: priceData.formula,
    };
  }

  // ============== UPDATE GOLD RATES ==============
  async updateGoldRates(rates) {
    const updatedRates = [];
    for (const [karat, data] of Object.entries(rates)) {
      const rate = await prisma.goldRate.upsert({
        where: {
          karat_currency: { karat: parseInt(karat), currency: 'INR' },
        },
        update: {
          ratePerGram: parseFloat(data.ratePerGram),
          purity: parseFloat(data.purity),
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

  // ============== GET GOLD RATES ==============
  async getGoldRates() {
    return prisma.goldRate.findMany({
      where: { isActive: true },
      orderBy: { karat: 'asc' },
    });
  }
}

module.exports = new JewelleryService();