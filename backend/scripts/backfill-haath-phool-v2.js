/**
 * Backfill script — Phase 2 updates for the Haath Phool test product.
 *
 * What it does:
 *   1. Sets availablePurities = ["9K","14K","18K","22K"] on every component
 *   2. Updates wastage percentages:
 *        ring      → 2.5%
 *        bridge    → 3%
 *        bracelet  → 2.5%
 *        medallion → 2.5%
 *   3. Updates bracelet makingChargeValue:
 *        PERCENTAGE 12% → 3%
 *   4. Leaves other making charges as-is
 *
 * Safe to re-run.
 *
 * Usage (from backend/):
 *   node scripts/backfill-haath-phool-v2.js
 */

const prisma = require('../src/lib/prisma');

const ALL_PURITIES = ['9K', '14K', '18K', '22K'];

const NEW_WASTAGE = {
  ring:      2.5,
  bridge:    3.0,
  bracelet:  2.5,
  medallion: 2.5,
};

async function main() {
  console.log('\n🔧  Backfilling Haath Phool v2 (purities + wastage + making)…\n');

  const haathPhool = await prisma.dynamicProduct.findFirst({
    where: { type: 'HAATH_PHOOL', isActive: true },
    include: { components: true, product: { select: { name: true } } },
  });

  if (!haathPhool) {
    console.error('❌  No active HAATH_PHOOL found. Aborting.');
    process.exit(1);
  }

  console.log(`✔  Found: "${haathPhool.product.name}"`);
  console.log(`   Components to update: ${haathPhool.components.length}\n`);

  for (const c of haathPhool.components) {
    const wastage = NEW_WASTAGE[c.componentKey] ?? Number(c.wastagePercentage);

    const data = {
      availablePurities: ALL_PURITIES,
      wastagePercentage: wastage,
    };

    // Bracelet: switch making charge from 12% to 3%
    if (c.componentKey === 'bracelet' && c.makingChargeType === 'PERCENTAGE') {
      data.makingChargeValue = 3.0;
    }

    const updated = await prisma.productComponent.update({
      where: { id: c.id },
      data,
    });

    console.log(
      `   ↻  ${updated.componentKey}/${updated.styleKey}  ` +
      `wastage=${updated.wastagePercentage}%  ` +
      `purities=[${updated.availablePurities.join(',')}]  ` +
      `making=${updated.makingChargeType}@${updated.makingChargeValue}`
    );
  }

  console.log('\n✅  Backfill complete.\n');
}

main()
  .catch((err) => {
    console.error('\n❌  Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });