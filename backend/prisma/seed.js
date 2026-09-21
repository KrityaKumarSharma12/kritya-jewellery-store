const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  try {
    // 1. Create Admin User
    console.log('📦 Creating admin...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@kritiyas.com' },
      update: {},
      create: {
        email: 'admin@kritiyas.com',
        password: adminPassword,
        name: 'Admin',
        role: 'ADMIN',
        phone: '9876543210',
      },
    });

    // 2. Create Admin User (for admin panel)
    console.log('📦 Creating admin user...');
    const adminUserPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.upsert({
      where: { email: 'admin@kritiyas.com' },
      update: {},
      create: {
        name: 'Super Admin',
        email: 'admin@kritiyas.com',
        password: adminUserPassword,
        role: 'SUPER_ADMIN',
        permissions: ['ALL'],
        isActive: true,
      },
    });

    // 3. Create Metal Rates
    console.log('📦 Creating metal rates...');
    const metalRates = [
      { metal: 'GOLD', karat: 24, purity: 99.99, ratePerGram: 9800 },
      { metal: 'GOLD', karat: 22, purity: 91.67, ratePerGram: 8980 },
      { metal: 'GOLD', karat: 18, purity: 75.0, ratePerGram: 7350 },
      { metal: 'GOLD', karat: 14, purity: 58.5, ratePerGram: 5730 },
      { metal: 'SILVER', karat: 0, purity: 99.9, ratePerGram: 120 },
      { metal: 'PLATINUM', karat: 0, purity: 99.95, ratePerGram: 3500 },
    ];

    for (const rate of metalRates) {
      await prisma.metalRate.upsert({
        where: {
          metal_karat_currency: {
            metal: rate.metal,
            karat: rate.karat,
            currency: 'INR'
          }
        },
        update: {
          ratePerGram: rate.ratePerGram,
          purity: rate.purity,
        },
        create: {
          metal: rate.metal,
          karat: rate.karat,
          purity: rate.purity,
          ratePerGram: rate.ratePerGram,
          currency: 'INR',
          source: 'MANUAL',
          isActive: true,
        }
      });
    }

    // 4. Create Diamond
    console.log('📦 Creating diamond...');
    const diamond = await prisma.diamond.upsert({
      where: { id: 'diamond-1' },
      update: {},
      create: {
        id: 'diamond-1',
        name: 'Round Brilliant Diamond',
        shape: 'Round',
        color: 'F',
        clarity: 'VS1',
        cut: 'Excellent',
        carat: 1.0,
        pricePerCarat: 70000,
        certification: 'IGI',
        isActive: true,
      },
    });

    // 5. Create Categories
    console.log('📦 Creating categories...');
    const categories = [
      { name: 'Rings', slug: 'rings', description: 'Beautiful rings for every occasion', isActive: true, displayOrder: 1 },
      { name: 'Earrings', slug: 'earrings', description: 'Elegant earrings collection', isActive: true, displayOrder: 2 },
      { name: 'Necklaces', slug: 'necklaces', description: 'Luxurious necklaces', isActive: true, displayOrder: 3 },
      { name: 'Bracelets', slug: 'bracelets', description: 'Stunning bracelets', isActive: true, displayOrder: 4 },
    ];

    const createdCategories = [];
    for (const category of categories) {
      const created = await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
      createdCategories.push(created);
    }

    // 6. Create Subcategories
    console.log('📦 Creating subcategories...');
    const ringsCategory = await prisma.category.findUnique({ where: { slug: 'rings' } });
    const earringsCategory = await prisma.category.findUnique({ where: { slug: 'earrings' } });

    if (ringsCategory) {
      await prisma.subcategory.createMany({
        data: [
          { name: 'Engagement Rings', slug: 'engagement-rings', categoryId: ringsCategory.id, isActive: true },
          { name: 'Wedding Rings', slug: 'wedding-rings', categoryId: ringsCategory.id, isActive: true },
          { name: 'Diamond Rings', slug: 'diamond-rings', categoryId: ringsCategory.id, isActive: true },
        ],
        skipDuplicates: true,
      });
    }

    if (earringsCategory) {
      await prisma.subcategory.createMany({
        data: [
          { name: 'Diamond Earrings', slug: 'diamond-earrings', categoryId: earringsCategory.id, isActive: true },
          { name: 'Gold Earrings', slug: 'gold-earrings', categoryId: earringsCategory.id, isActive: true },
        ],
        skipDuplicates: true,
      });
    }

    // 7. Create Regular Products
    console.log('📦 Creating regular products...');
    const regularProducts = [
      {
        id: 'product-1',
        name: 'Gold Plated Necklace',
        description: 'Beautiful gold plated necklace with elegant design',
        price: 2999,
        category: 'Necklaces',
        material: 'Gold Plated',
        weight: '25g',
        images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400'],
        stock: 15,
        isActive: true,
      },
      {
        id: 'product-2',
        name: 'Silver Diamond Ring',
        description: 'Elegant silver ring with brilliant diamonds',
        price: 4999,
        category: 'Rings',
        material: 'Silver',
        weight: '12g',
        images: ['https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400'],
        stock: 8,
        isActive: true,
      },
    ];

    const createdProducts = [];
    for (const product of regularProducts) {
      const created = await prisma.product.upsert({
        where: { id: product.id },
        update: {},
        create: product,
      });
      createdProducts.push(created);
    }

    // 8. Create Jewellery Product with Variants
    console.log('📦 Creating jewellery product...');
    
    // First, check if the jewellery product already exists
    const existingJewelleryProduct = await prisma.jewelleryProduct.findUnique({
      where: { sku: 'JWL-001' }
    });

    let jewelleryProduct;
    if (existingJewelleryProduct) {
      // Delete existing variants and images
      await prisma.jewelleryVariant.deleteMany({
        where: { productId: existingJewelleryProduct.id }
      });
      await prisma.jewelleryImage.deleteMany({
        where: { productId: existingJewelleryProduct.id }
      });
      
      // Update the product
      jewelleryProduct = await prisma.jewelleryProduct.update({
        where: { id: existingJewelleryProduct.id },
        data: {
          name: 'Hidden Halo Round Diamond Earrings',
          sku: 'JWL-001',
          description: 'Beautiful hidden halo round diamond earrings with excellent craftsmanship.',
          category: 'Earring',
          subCategory: 'Diamond Earrings',
          gender: 'UNISEX',
          isActive: true,
          isBestseller: true,
          isGifting: true,
        },
      });
    } else {
      // Create new jewellery product
      jewelleryProduct = await prisma.jewelleryProduct.create({
        data: {
          name: 'Hidden Halo Round Diamond Earrings',
          sku: 'JWL-001',
          description: 'Beautiful hidden halo round diamond earrings with excellent craftsmanship.',
          category: 'Earring',
          subCategory: 'Diamond Earrings',
          gender: 'UNISEX',
          isActive: true,
          isBestseller: true,
          isGifting: true,
        },
      });
    }

    // Create images
    const images = [
      {
        url: 'https://images.unsplash.com/photo-1535632066927-ab7f9ab60e8e?w=600',
        altText: 'Hidden Halo Round Diamond Earrings',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=600',
        altText: 'Hidden Halo Round Diamond Earrings Side',
        isPrimary: false,
        sortOrder: 1,
      },
    ];

    for (const image of images) {
      await prisma.jewelleryImage.create({
        data: {
          ...image,
          productId: jewelleryProduct.id,
        },
      });
    }

    // Create variants
    const variantData = [
      {
        metalType: 'Yellow',
        metalKarat: 9,
        goldWeight: 0.8,
        diamondId: diamond.id,
        diamondCarat: 2.66,
        diamondShape: 'Radiant',
        diamondColor: 'E-F',
        diamondClarity: 'VVS-VS',
        diamondCut: 'Excellent',
        diamondPieces: 2,
        makingChargeType: 'PERCENTAGE',
        makingCharge: 15,
        wastagePercent: 5,
        basePrice: 100627,
        currentPrice: 100627,
        stock: 10,
        sku: 'JWL-001-9K-YELLOW',
        isDefault: true,
        isActive: true,
        size: '5mm',
        productId: jewelleryProduct.id,
      },
      {
        metalType: 'Yellow',
        metalKarat: 14,
        goldWeight: 0.93,
        diamondId: diamond.id,
        diamondCarat: 2.66,
        diamondShape: 'Round',
        diamondColor: 'EF',
        diamondClarity: 'VVS-VS',
        diamondCut: 'Excellent',
        diamondPieces: 2,
        makingChargeType: 'PERCENTAGE',
        makingCharge: 15,
        wastagePercent: 5,
        basePrice: 104346,
        currentPrice: 104346,
        stock: 8,
        sku: 'JWL-001-14K-YELLOW',
        isDefault: false,
        isActive: true,
        size: '5mm',
        productId: jewelleryProduct.id,
      },
      {
        metalType: 'Yellow',
        metalKarat: 18,
        goldWeight: 1.11,
        diamondId: diamond.id,
        diamondCarat: 2.66,
        diamondShape: 'Round',
        diamondColor: 'EF',
        diamondClarity: 'VVS-VS',
        diamondCut: 'Excellent',
        diamondPieces: 2,
        makingChargeType: 'PERCENTAGE',
        makingCharge: 15,
        wastagePercent: 5,
        basePrice: 108772,
        currentPrice: 108772,
        stock: 5,
        sku: 'JWL-001-18K-YELLOW',
        isDefault: false,
        isActive: true,
        size: '5mm',
        productId: jewelleryProduct.id,
      },
    ];

    const createdVariants = [];
    for (const variant of variantData) {
      const created = await prisma.jewelleryVariant.upsert({
        where: { sku: variant.sku },
        update: variant,
        create: variant,
      });
      createdVariants.push(created);
    }

    // 9. Create Inventory for the variants
    console.log('📦 Creating inventory...');
    
    // Get the first regular product for the productId reference
    const firstProduct = createdProducts[0];
    
    for (const variant of createdVariants) {
      // Check if inventory already exists
      const existingInventory = await prisma.inventory.findFirst({
        where: { variantId: variant.id }
      });

      if (!existingInventory) {
        await prisma.inventory.create({
          data: {
            productId: firstProduct.id, // Reference to a regular Product
            variantId: variant.id,
            quantity: variant.stock,
            reserved: 0,
            sold: 0,
            damaged: 0,
            status: 'IN_STOCK',
            grossWeight: variant.goldWeight,
            netWeight: variant.goldWeight,
            metalWeight: variant.goldWeight,
            diamondWeight: variant.diamondCarat,
          }
        });
      }
    }

    // 10. Create Coupons
    console.log('📦 Creating coupons...');
    const coupons = [
      {
        code: 'WELCOME10',
        description: '10% off for new customers',
        type: 'PERCENTAGE',
        value: 10,
        maxDiscount: 5000,
        minOrder: 25000,
        usageLimit: 100,
        isActive: true,
        isGlobal: true,
      },
      {
        code: 'DIWALI2026',
        description: 'Diwali special discount',
        type: 'PERCENTAGE',
        value: 15,
        maxDiscount: 10000,
        minOrder: 50000,
        usageLimit: 50,
        isActive: true,
        isGlobal: true,
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on all orders',
        type: 'FREE_SHIPPING',
        value: 0,
        minOrder: 10000,
        usageLimit: 200,
        isActive: true,
        isGlobal: true,
      },
    ];

    for (const coupon of coupons) {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: {},
        create: coupon,
      });
    }

    // 11. Create Banners
    console.log('📦 Creating banners...');
    const banners = [
      {
        title: 'Luxury Diamond Collection',
        subtitle: 'Exclusive handcrafted pieces',
        description: 'Discover our premium diamond jewelry collection',
        imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200',
        link: '/collections/diamond',
        buttonText: 'Shop Now',
        position: 'HOME',
        sortOrder: 0,
        isActive: true,
      },
      {
        title: 'Gold Rush Sale',
        subtitle: 'Up to 30% off on selected items',
        description: 'Limited time offer on gold jewelry',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
        link: '/collections/gold-sale',
        buttonText: 'View Sale',
        position: 'HOME',
        sortOrder: 1,
        isActive: true,
      },
    ];

    for (const banner of banners) {
      await prisma.banner.create({ data: banner });
    }

    // 12. Create Store Settings
    console.log('📦 Creating store settings...');
    await prisma.storeSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        storeName: "Kritya's Jewellery",
        storeEmail: 'info@kritiyasjewellery.com',
        storePhone: '+91 98765 43210',
        storeAddress: '123 Jewellery Lane, Mumbai, India',
        currency: 'INR',
        taxRate: 3.0,
        shippingCost: 0,
        freeShippingAbove: 5000,
        notificationEmail: true,
        notificationSMS: false,
        returnDays: 7,
        returnPolicy: 'Items can be returned within 7 days of delivery.',
        isActive: true,
      },
    });

    console.log(`✅ Jewellery product created: ${jewelleryProduct.name}`);
    console.log(`✅ Diamond created: ${diamond.shape} ${diamond.carat}ct`);
    console.log(`✅ ${createdProducts.length} regular products created`);
    console.log(`✅ ${metalRates.length} metal rates created`);
    console.log(`✅ ${coupons.length} coupons created`);
    console.log(`✅ ${banners.length} banners created`);
    console.log('🎉 Seed completed successfully!');

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });