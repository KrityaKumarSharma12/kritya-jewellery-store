/**
 * Copy the full component + sizing rule configuration from one
 * Haath Phool (the "source" — usually the Test product) to another
 * Haath Phool (the "target" — usually the real product).
 *
 * Usage (from backend/):
 *   node scripts/copy-haath-phool-config.js
 */

const prisma = require('../src/lib/prisma');

const SOURCE_NAME = process.argv[2] || 'Test — Kundan Lotus Haath Phool';
const TARGET_NAME = process.argv[3] || 'Antique Haath Phool';

// Convert Prisma Decimal (or number, or serialized {s,e,d}) to plain number
const toNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  if (typeof v.toNumber === 'function') return v.toNumber();
  if (typeof v === 'object' && 's' in v && 'e' in v && Array.isArray(v.d)) {
    const sign = v.s >= 0 ? 1 : -1;
    const digits = v.d.join('');
    const exp = v.e;
    return sign * Number(digits) * Math.pow(10, exp - digits.length + 1);
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function main() {
  console.log('\n🔁  Copying Haath Phool config\n');
  console.log(`   Source: ${SOURCE_NAME}`);
  console.log(`   Target: ${TARGET_NAME}\n`);

  // 1. Locate both products by name
  const sourceProduct = await prisma.product.findFirst({
    where: { name: SOURCE_NAME },
    include: {
      dynamicProduct: {
        include: { components: true, sizingRules: true },
      },
    },
  });

  if (!sourceProduct) {
    console.error(`❌  Source product not found: "${SOURCE_NAME}"`);
    process.exit(1);
  }
  if (!sourceProduct.dynamicProduct) {
    console.error(`❌  Source product has no linked DynamicProduct`);
    process.exit(1);
  }

  const targetProduct = await prisma.product.findFirst({
    where: { name: TARGET_NAME },
    include: {
      dynamicProduct: {
        include: { components: true, sizingRules: true },
      },
    },
  });

  if (!targetProduct) {
    console.error(`❌  Target product not found: "${TARGET_NAME}"`);
    process.exit(1);
  }
  if (!targetProduct.dynamicProduct) {
    console.error(`❌  Target product has no linked DynamicProduct`);
    process.exit(1);
  }

  const sourceDP = sourceProduct.dynamicProduct;
  const targetDP = targetProduct.dynamicProduct;

  console.log(`📋  Source has: ${sourceDP.components.length} components, ${sourceDP.sizingRules.length} sizing rules`);
  console.log(`📋  Target has: ${targetDP.components.length} components, ${targetDP.sizingRules.length} sizing rules\n`);

  if (sourceDP.components.length === 0) {
    console.error('❌  Source has no components to copy. Aborting.');
    process.exit(1);
  }

  // 2. Delete existing target components + sizing rules
  console.log('🗑   Clearing target configuration...');
  const deletedComponents = await prisma.productComponent.deleteMany({
    where: { dynamicProductId: targetDP.id },
  });
  const deletedRules = await prisma.sizingWeightRule.deleteMany({
    where: { dynamicProductId: targetDP.id },
  });
  console.log(`     Deleted ${deletedComponents.count} components, ${deletedRules.count} sizing rules\n`);

  // 3. Copy DynamicProduct-level caps
  console.log('📐  Copying caps...');
  await prisma.dynamicProduct.update({
    where: { id: targetDP.id },
    data: {
      maxRings: sourceDP.maxRings,
      maxChainsPerRing: sourceDP.maxChainsPerRing,
      maxMedallions: sourceDP.maxMedallions,
      chainLengthByFinger: sourceDP.chainLengthByFinger,
      bundleDiscountPct: toNumber(sourceDP.bundleDiscountPct),
    },
  });
  console.log(`     maxRings = ${sourceDP.maxRings}`);
  console.log(`     maxChainsPerRing = ${sourceDP.maxChainsPerRing}`);
  console.log(`     maxMedallions = ${sourceDP.maxMedallions}\n`);

  // 4. Copy components 1:1
  console.log('🧩  Copying components...');
  for (const c of sourceDP.components) {
    await prisma.productComponent.create({
      data: {
        dynamicProductId: targetDP.id,
        name: c.name,
        componentKey: c.componentKey,
        zone: c.zone,
        isRepeatable: c.isRepeatable,
        maxQuantity: c.maxQuantity,
        isOptional: c.isOptional,
        styleKey: c.styleKey,
        priceBasis: c.priceBasis,
        metalType: c.metalType,
        purity: c.purity,
        availablePurities: c.availablePurities,
        baseWeightGrams: toNumber(c.baseWeightGrams),
        wastagePercentage: toNumber(c.wastagePercentage),
        makingChargeType: c.makingChargeType,
        makingChargeValue: toNumber(c.makingChargeValue),
        gemstones: c.gemstones,
        stoneWeightGrams: toNumber(c.stoneWeightGrams),
        displayOrder: c.displayOrder,
      },
    });
    console.log(`     ✓ ${c.componentKey}/${c.styleKey} — ${c.name}`);
  }

  // 5. Copy sizing rules 1:1
  console.log('\n📏  Copying sizing rules...');
  for (const r of sourceDP.sizingRules) {
    await prisma.sizingWeightRule.create({
      data: {
        dynamicProductId: targetDP.id,
        componentKey: r.componentKey,
        sizeOption: r.sizeOption,
        weightSurgeGrams: toNumber(r.weightSurgeGrams),
        isDefault: r.isDefault,
      },
    });
    console.log(`     ✓ ${r.componentKey} · ${r.sizeOption} · ${toNumber(r.weightSurgeGrams)}g`);
  }

  console.log('\n✅  Copy complete.\n');
  console.log(`   Target now has ${sourceDP.components.length} components and ${sourceDP.sizingRules.length} sizing rules.`);
  console.log(`   Refresh the PDP for "${TARGET_NAME}" — pricing should now compute.\n`);
}

main()
  .catch((err) => {
    console.error('\n❌  Copy failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });