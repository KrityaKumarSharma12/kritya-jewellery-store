const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding orphaned Test-2 Haath Phool products...\n');

  const orphans = await prisma.product.findMany({
    where: {
      category: 'Haath Phool',
      name: { startsWith: 'Test-2' },
      dynamicProduct: { is: null },  // ← only products with NO linked DynamicProduct
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (orphans.length === 0) {
    console.log('✅ No orphaned products found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${orphans.length} orphaned product(s):`);
  console.table(
    orphans.map((r) => ({
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }))
  );

  console.log('\n🗑️  Deleting...');
  for (const r of orphans) {
    await prisma.product.delete({ where: { id: r.id } });
    console.log(`  ✓ Deleted ${r.id} (${r.name})`);
  }

  console.log(`\n✅ Deleted ${orphans.length} orphaned product(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());