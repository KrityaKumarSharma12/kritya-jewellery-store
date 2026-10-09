/**
 * Seed script for the Haath Phool dynamic product configuration.
 *
 * What it does:
 *   1. Finds the DynamicProduct row of type HAATH_PHOOL
 *   2. Sets maxRings = 5 and chainLengthByFinger (per-finger chain lengths in cm)
 *   3. Makes 'ring' and 'bridge' repeatable (isRepeatable=true, maxQuantity=5)
 *   4. Creates three medallion style variants (lotus, kundan, polki)
 *   5. Leaves 'bracelet' untouched
 *
 * Safe to run multiple times — uses upsert semantics (no rows are deleted).
 *
 * Usage (from backend/):
 *   node scripts/seed-haath-phool-rules.js
 */

const prisma = require('../src/lib/prisma');

// -------- Configuration: tweak these numbers as needed --------
const CHAIN_LENGTH_BY_FINGER = {
  thumb:  8,   // cm — thumb chain is shortest (closest to wrist)
  index:  11,
  middle: 13,  // cm — middle finger chain is longest (medallion sits here)
  ring:   12,
  pinky:  9,
};

const MEDALLION_VARIANTS = [
  {
    styleKey: 'lotus',
    name: 'Medallion — Lotus',
    baseWeightGrams: 5.0,
    makingChargeValue: 2500,
    displayOrder: 3,
  },
  {
    styleKey: 'kundan',
    name: 'Medallion — Kundan',
    baseWeightGrams: 6.0,
    makingChargeValue: 3000,
    displayOrder: 4,
  },
  {
    styleKey: 'polki',
    name: 'Medallion — Polki',
    baseWeightGrams: 7.0,
    makingChargeValue: 3500,
    displayOrder: 5,
  },
];

// -----------------------------------------------------------

const toDecimal = (n) => n; // Prisma accepts plain numbers for Decimal fields on write

async function main() {
  console.log('\n🌱  Seeding Haath Phool dynamic product configuration...\n');

  // 1. Locate the HAATH_PHOOL DynamicProduct (there should be exactly one for now)
  const haathPhool = await prisma.dynamicProduct.findFirst({
    where: { type: 'HAATH_PHOOL', isActive: true },
    include: { components: true, product: { select: { id: true, name: true } } },
  });

  if (!haathPhool) {
    console.error('❌  No active HAATH_PHOOL DynamicProduct found. Aborting.');
    process.exit(1);
  }

  console.log(`✔  Found Haath Phool: "${haathPhool.product.name}" (productId=${haathPhool.productId})`);
  console.log(`   DynamicProduct id: ${haathPhool.id}\n`);

  // 2. Update DynamicProduct with caps + chain length map
  const updatedDP = await prisma.dynamicProduct.update({
    where: { id: haathPhool.id },
    data: {
      maxRings: 5,
      chainLengthByFinger: CHAIN_LENGTH_BY_FINGER,
      // maxChainsPerRing and maxMedallions are already 1 from schema defaults
    },
  });
  console.log('✔  DynamicProduct updated:');
  console.log(`   maxRings = ${updatedDP.maxRings}`);
  console.log(`   chainLengthByFinger = ${JSON.stringify(updatedDP.chainLengthByFinger)}\n`);

  // 3. Update 'ring' component — make it repeatable
  const ring = await prisma.productComponent.findFirst({
    where: { dynamicProductId: haathPhool.id, componentKey: 'ring', styleKey: 'classic' },
  });
  if (ring) {
    const updated = await prisma.productComponent.update({
      where: { id: ring.id },
      data: { isRepeatable: true, maxQuantity: 5 },
    });
    console.log(`✔  'ring' updated: isRepeatable=${updated.isRepeatable}, maxQuantity=${updated.maxQuantity}`);
  } else {
    console.warn('⚠️  No "ring" component found for this Haath Phool — skipping.');
  }

  // 4. Update 'bridge' component — make it repeatable
  const bridge = await prisma.productComponent.findFirst({
    where: { dynamicProductId: haathPhool.id, componentKey: 'bridge', styleKey: 'classic' },
  });
  if (bridge) {
    const updated = await prisma.productComponent.update({
      where: { id: bridge.id },
      data: { isRepeatable: true, maxQuantity: 5 },
    });
    console.log(`✔  'bridge' updated: isRepeatable=${updated.isRepeatable}, maxQuantity=${updated.maxQuantity}`);
  } else {
    console.warn('⚠️  No "bridge" component found for this Haath Phool — skipping.');
  }

  // 5. Upsert the three medallion variants
  console.log('\n   Medallions:');
  for (const m of MEDALLION_VARIANTS) {
    const existing = await prisma.productComponent.findFirst({
      where: {
        dynamicProductId: haathPhool.id,
        componentKey: 'medallion',
        styleKey: m.styleKey,
      },
    });

    const data = {
      dynamicProductId: haathPhool.id,
      componentKey: 'medallion',
      styleKey: m.styleKey,
      name: m.name,
      zone: 'center',
      isOptional: true,
      isRepeatable: false,
      maxQuantity: 1,
      priceBasis: 'FLAT',
      metalType: 'GOLD',
      purity: '22K',
      baseWeightGrams: toDecimal(m.baseWeightGrams),
      wastagePercentage: 0,
      makingChargeType: 'FLAT',
      makingChargeValue: toDecimal(m.makingChargeValue),
      gemstones: [],
      stoneWeightGrams: 0,
      displayOrder: m.displayOrder,
    };

    if (existing) {
      const updated = await prisma.productComponent.update({
        where: { id: existing.id },
        data,
      });
      console.log(`   ↻  updated "${m.styleKey}" (id=${updated.id})`);
    } else {
      const created = await prisma.productComponent.create({ data });
      console.log(`   +  created "${m.styleKey}" (id=${created.id})`);
    }
  }

  // 6. Summary of the final component set
  console.log('\n📋  Final ProductComponent rows:');
  const allComponents = await prisma.productComponent.findMany({
    where: { dynamicProductId: haathPhool.id },
    orderBy: [{ displayOrder: 'asc' }, { componentKey: 'asc' }],
  });
  for (const c of allComponents) {
    console.log(
      `   [${c.displayOrder}] ${c.componentKey}/${c.styleKey}  ` +
      `repeatable=${c.isRepeatable}  max=${c.maxQuantity}  ` +
      `optional=${c.isOptional}  basis=${c.priceBasis}`
    );
  }

  console.log('\n✅  Seed complete.\n');
}

main()
  .catch((err) => {
    console.error('\n❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });