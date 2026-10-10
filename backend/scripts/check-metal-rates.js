const prisma = require('../src/lib/prisma');

async function main() {
  const rates = await prisma.metalRate.findMany({
    where: { isActive: true },
    orderBy: [{ metal: 'asc' }, { karat: 'asc' }],
    select: {
      id: true,
      metal: true,
      karat: true,
      purity: true,
      ratePerGram: true,
      isActive: true,
    },
  });

  console.log('\n📋  Active MetalRate rows:\n');
  console.table(
    rates.map((r) => ({
      id: r.id,
      metal: r.metal,
      karat: r.karat,
      purity: r.purity?.toString?.() ?? r.purity,
      ratePerGram: r.ratePerGram?.toString?.() ?? r.ratePerGram,
    }))
  );

  console.log(`\nTotal: ${rates.length} rows\n`);
}

main()
  .catch((err) => {
    console.error('❌  Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());