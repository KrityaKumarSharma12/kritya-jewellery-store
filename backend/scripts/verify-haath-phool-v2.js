/**
 * Verify the Haath Phool v2 backfill actually landed.
 * Prints a clean table of every ProductComponent row.
 *
 * Usage (from backend/):
 *   node scripts/verify-haath-phool-v2.js
 */

const prisma = require('../src/lib/prisma');

// Handles Prisma Decimal, Decimal.js, number, and serialized { s, e, d }
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
  const rows = await prisma.productComponent.findMany({
    orderBy: [{ componentKey: 'asc' }, { styleKey: 'asc' }],
    select: {
      componentKey: true,
      styleKey: true,
      wastagePercentage: true,
      makingChargeType: true,
      makingChargeValue: true,
      availablePurities: true,
    },
  });

  const table = rows.map((r) => ({
    componentKey: r.componentKey,
    styleKey: r.styleKey,
    wastage: toNum(r.wastagePercentage),
    makingType: r.makingChargeType,
    makingValue: toNum(r.makingChargeValue),
    purities: r.availablePurities.join(','),
  }));

  console.table(table);

  const bracelet = rows.find((r) => r.componentKey === 'bracelet');
  const ring = rows.find((r) => r.componentKey === 'ring');
  const bridge = rows.find((r) => r.componentKey === 'bridge');

  console.log('\n─── Sanity check ───');
  console.log(`ring wastage       = ${toNum(ring?.wastagePercentage)}    (expected 2.5)`);
  console.log(`bridge wastage     = ${toNum(bridge?.wastagePercentage)}    (expected 3)`);
  console.log(`bracelet wastage   = ${toNum(bracelet?.wastagePercentage)}    (expected 2.5)`);
  console.log(`bracelet making    = ${toNum(bracelet?.makingChargeValue)}    (expected 3)`);
  console.log(`ring purities      = [${ring?.availablePurities.join(',')}]`);

  const ok =
    toNum(ring?.wastagePercentage) === 2.5 &&
    toNum(bridge?.wastagePercentage) === 3 &&
    toNum(bracelet?.wastagePercentage) === 2.5 &&
    toNum(bracelet?.makingChargeValue) === 3 &&
    ring?.availablePurities.length === 4;

  console.log(ok ? '\n✅  All values correct\n' : '\n⚠️  Some values are NOT as expected\n');
}

main()
  .catch((err) => {
    console.error('\n❌  Verify failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });