// ============================================================
// Seed a test Haath Phool for dynamic pricing verification
// ============================================================
//
// Run once:  node scripts/seed-haath-phool.js
// Re-running is safe — it deletes the previous test product first.
//
// The numbers match our earlier manual verification:
//   Ring     → ₹60,626.92
//   Bridge   → ₹36,326.78
//   Bracelet → ₹142,765.02
//   TOTAL    → ₹239,718.72
// ============================================================

const prisma = require('../src/lib/prisma');

const TEST_NAME = 'Test — Kundan Lotus Haath Phool';

async function main() {
  // 1. Clean up any previous test product -----------------------
  const existing = await prisma.product.findFirst({
    where: { name: TEST_NAME },
    include: { dynamicProduct: true },
  });
  if (existing) {
    if (existing.dynamicProduct) {
      // Cascades delete ProductComponent + SizingWeightRule
      await prisma.dynamicProduct.delete({
        where: { id: existing.dynamicProduct.id },
      });
    }
    await prisma.product.delete({ where: { id: existing.id } });
    console.log('🗑  Removed previous test product');
  }

  // 2. Create the Product ---------------------------------------
  const product = await prisma.product.create({
    data: {
      name: TEST_NAME,
      description: 'A test Haath Phool for pricing engine verification.',
      price: 240000, // informational; dynamic engine ignores this
      category: 'Haath Phool',
      material: 'Gold',
      weight: '23.68g',
      images: [],
      stock: 1,
      isActive: true,
    },
  });
  console.log('✅ Product created:', product.id);

  // 3. Create the DynamicProduct wrapper ------------------------
  const dynamicProduct = await prisma.dynamicProduct.create({
    data: {
      productId: product.id,
      type: 'HAATH_PHOOL',
      bundleDiscountPct: 0,
      isActive: true,
    },
  });
  console.log('✅ DynamicProduct created:', dynamicProduct.id);

  // 4. Create the 3 components ----------------------------------
  const componentsData = [
    {
      componentKey: 'ring',
      name: 'Ring',
      zone: 'ring',
      displayOrder: 0,
      metalType: 'GOLD',
      purity: '22K',
      baseWeightGrams: 4.5,
      wastagePercentage: 8,
      makingChargeType: 'PER_GRAM',
      makingChargeValue: 450,
      gemstones: [
        { name: 'Center diamond', type: 'Diamond', carats: 0.15, ratePerCarat: 80000, settingCharge: 200, count: 1, isCluster: false, zone: 'ring' },
      ],
      stoneWeightGrams: 0.03,
    },
    {
      componentKey: 'bridge',
      name: 'Bridge',
      zone: 'bridge',
      displayOrder: 1,
      metalType: 'GOLD',
      purity: '22K',
      baseWeightGrams: 3.2,
      wastagePercentage: 12,
      makingChargeType: 'FLAT',
      makingChargeValue: 2000,
      gemstones: [
        { name: 'Kundan center', type: 'Kundan', carats: 3.5, ratePerCarat: 1200, settingCharge: 200, count: 1, isCluster: false, zone: 'phool' },
        { name: 'Pearl border', type: 'Pearl', carats: 0.5, ratePerCarat: 300, settingCharge: 50, count: 12, isCluster: true, zone: 'bridge' },
      ],
      stoneWeightGrams: 0.8,
    },
    {
      componentKey: 'bracelet',
      name: 'Bracelet',
      zone: 'bracelet',
      displayOrder: 2,
      metalType: 'GOLD',
      purity: '22K',
      baseWeightGrams: 12.5,
      wastagePercentage: 10,
      makingChargeType: 'PERCENTAGE',
      makingChargeValue: 12,
      gemstones: [],
      stoneWeightGrams: 0,
    },
  ];

  for (const c of componentsData) {
    await prisma.productComponent.create({
      data: {
        ...c,
        dynamicProductId: dynamicProduct.id,
      },
    });
    console.log(`✅ Component "${c.componentKey}" created`);
  }

  // 5. Create sizing weight rules -------------------------------
  const sizingRules = [
    // Ring
    { componentKey: 'ring', sizeOption: 'size_6', weightSurgeGrams: 0.0,  isDefault: true },
    { componentKey: 'ring', sizeOption: 'size_7', weightSurgeGrams: 0.15, isDefault: false },
    { componentKey: 'ring', sizeOption: 'size_8', weightSurgeGrams: 0.30, isDefault: false },
    // Bridge
    { componentKey: 'bridge', sizeOption: '4.0_inch', weightSurgeGrams: 0.0, isDefault: true },
    { componentKey: 'bridge', sizeOption: '4.5_inch', weightSurgeGrams: 0.5, isDefault: false },
    { componentKey: 'bridge', sizeOption: '5.0_inch', weightSurgeGrams: 1.0, isDefault: false },
    // Bracelet
    { componentKey: 'bracelet', sizeOption: '6.0_inch', weightSurgeGrams: 0.0, isDefault: true },
    { componentKey: 'bracelet', sizeOption: '6.5_inch', weightSurgeGrams: 0.4, isDefault: false },
    { componentKey: 'bracelet', sizeOption: '7.0_inch', weightSurgeGrams: 0.8, isDefault: false },
  ];

  for (const r of sizingRules) {
    await prisma.sizingWeightRule.create({
      data: {
        ...r,
        dynamicProductId: dynamicProduct.id,
      },
    });
  }
  console.log(`✅ ${sizingRules.length} sizing rules created`);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Product ID:', product.id);
  console.log('Use this ID for API testing:');
  console.log(`  GET  /api/products/${product.id}/dynamic-config`);
  console.log(`  POST /api/products/${product.id}/price-preview`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());