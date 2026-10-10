/**
 * Adds a GOLD 9K row to the MetalRate table, derived from the
 * existing 24K rate using the standard purity ratio.
 *
 * Safe to re-run — uses upsert on (metal, karat, currency).
 *
 * Usage (from backend/):
 *   node scripts/add-9k-metal-rate.js
 */

const prisma = require('../src/lib/prisma');

const toNum = (v) => {
  if (v == null) return 0;
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
  return Number.isFinite(n) ? n : 0;
};

async function main() {
  console.log('\n🔧  Adding GOLD 9K rate…\n');

  // Find the 24K row to derive from (standard baseline)
  const row24 = await prisma.metalRate.findFirst({
    where: { metal: 'GOLD', karat: 24, currency: 'INR', isActive: true },
  });

  if (!row24) {
    console.error('❌  No active GOLD 24K rate found. Aborting.');
    process.exit(1);
  }

  const rate24 = toNum(row24.ratePerGram);
  const purity24 = toNum(row24.purity);   // usually ~99.9

  // 9K is 37.5% pure gold
  const purity9 = 37.5;
  const rate9 = Math.round(rate24 * (purity9 / purity24));

  console.log(`   From 24K: ₹${rate24}/g at ${purity24}% purity`);
  console.log(`   Derived 9K: ₹${rate9}/g at ${purity9}% purity\n`);

  // Upsert 9K
  const upserted = await prisma.metalRate.upsert({
    where: {
      metal_karat_currency: {
        metal: 'GOLD',
        karat: 9,
        currency: 'INR',
      },
    },
    update: {
      purity: purity9,
      ratePerGram: rate9,
      isActive: true,
    },
    create: {
      metal: 'GOLD',
      karat: 9,
      purity: purity9,
      ratePerGram: rate9,
      currency: 'INR',
      source: 'DERIVED_9K',
      isActive: true,
    },
  });

  console.log(`✅  GOLD 9K row ready (id=${upserted.id})`);
  console.log(`   ratePerGram = ₹${toNum(upserted.ratePerGram)}/g`);
  console.log(`   purity      = ${toNum(upserted.purity)}%\n`);

  // Show all GOLD rows for confirmation
  const goldRows = await prisma.metalRate.findMany({
    where: { metal: 'GOLD', currency: 'INR', isActive: true },
    orderBy: { karat: 'asc' },
  });

  console.log('📋  All GOLD rates now:\n');
  console.table(
    goldRows.map((r) => ({
      karat: r.karat,
      purity: toNum(r.purity),
      ratePerGram: toNum(r.ratePerGram),
    }))
  );
}

main()
  .catch((err) => {
    console.error('\n❌  Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());