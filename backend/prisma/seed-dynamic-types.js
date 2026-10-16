const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DYNAMIC_TYPES = ['Haath Phool', 'Couple Bands', 'Bridal Set'];

async function main() {
  console.log('🌱 Seeding dynamic jewellery types...');

  for (const name of DYNAMIC_TYPES) {
    const result = await prisma.jewelleryType.upsert({
      where:  { name },
      update: { isDynamic: true, isActive: true },
      create: { name, isDynamic: true, isActive: true },
    });
    console.log(`  ✅ ${result.name} → isDynamic=${result.isDynamic}`);
  }

  const all = await prisma.jewelleryType.findMany({
    orderBy: { name: 'asc' },
    select:  { name: true, isDynamic: true },
  });
  console.log('\n📋 Current JewelleryType table:');
  console.table(all);

  console.log('🎉 Done.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());