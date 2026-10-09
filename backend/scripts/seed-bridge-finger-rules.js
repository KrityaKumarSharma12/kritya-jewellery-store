/**
 * Adds one SizingWeightRule per finger for the 'bridge' component.
 *
 * The bridge component's base weight (3.2g) is treated as the reference
 * for a "middle" finger bridge. Each finger's surge is the extra weight
 * of its chain beyond that reference.
 *
 *   thumb  → 8 cm  → 0g      (shortest, roughly = base)
 *   index  → 11 cm → +1.0g
 *   middle → 13 cm → +1.6g   (longest, treated as reference)
 *   ring   → 12 cm → +1.3g
 *   pinky  → 9 cm  → +0.3g
 *
 * Tune these numbers after you have real measured weights.
 *
 * Safe to re-run — upserts by (dynamicProductId, componentKey, sizeOption).
 *
 * Usage (from backend/):
 *   node scripts/seed-bridge-finger-rules.js
 */

const prisma = require('../src/lib/prisma');

// Reference finger whose chain weight == bridge.baseWeightGrams (no surge)
const REFERENCE_FINGER = 'middle';

// Approximate weight surge per finger, in grams.
// A chain weighs roughly proportional to its length, so longer finger =
// heavier chain = larger positive surge.
const SURGE_BY_FINGER = {
  thumb:  0.0,
  index:  1.0,
  middle: 1.6,
  ring:   1.3,
  pinky:  0.3,
};

// Order matters for display, not for pricing — the engine looks up by key.
const FINGER_OPTION_KEYS = {
  thumb:  'finger_thumb',
  index:  'finger_index',
  middle: 'finger_middle',
  ring:   'finger_ring',
  pinky:  'finger_pinky',
};

async function main() {
  console.log('\n🌱  Seeding per-finger bridge sizing rules...\n');

  // Locate the HAATH_PHOOL dynamic product
  const haathPhool = await prisma.dynamicProduct.findFirst({
    where: { type: 'HAATH_PHOOL', isActive: true },
    include: { product: { select: { name: true } } },
  });

  if (!haathPhool) {
    console.error('❌  No active HAATH_PHOOL DynamicProduct found. Aborting.');
    process.exit(1);
  }

  console.log(`✔  Haath Phool: "${haathPhool.product.name}"`);
  console.log(`   DynamicProduct id: ${haathPhool.id}\n`);

  // Confirm the bridge component exists
  const bridge = await prisma.productComponent.findFirst({
    where: {
      dynamicProductId: haathPhool.id,
      componentKey: 'bridge',
      styleKey: 'classic',
    },
  });
  if (!bridge) {
    console.error('❌  No "bridge/classic" component found for this Haath Phool.');
    process.exit(1);
  }

  console.log('   Bridge sizing rules:');
  for (const [finger, surge] of Object.entries(SURGE_BY_FINGER)) {
    const sizeOption = FINGER_OPTION_KEYS[finger];
    const isDefault = finger === REFERENCE_FINGER;

    const existing = await prisma.sizingWeightRule.findFirst({
      where: {
        dynamicProductId: haathPhool.id,
        componentKey: 'bridge',
        sizeOption,
      },
    });

    if (existing) {
      const updated = await prisma.sizingWeightRule.update({
        where: { id: existing.id },
        data: { weightSurgeGrams: surge, isDefault },
      });
      console.log(`   ↻  ${sizeOption.padEnd(16)} surge=${surge}g${isDefault ? ' (default)' : ''}`);
    } else {
      const created = await prisma.sizingWeightRule.create({
        data: {
          dynamicProductId: haathPhool.id,
          componentKey: 'bridge',
          sizeOption,
          weightSurgeGrams: surge,
          isDefault,
        },
      });
      console.log(`   +  ${sizeOption.padEnd(16)} surge=${surge}g${isDefault ? ' (default)' : ''}`);
    }
  }

  console.log('\n✅  Done.\n');
}

main()
  .catch((err) => {
    console.error('\n❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });