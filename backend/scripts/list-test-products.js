const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.product.findMany({
    where: { name: { startsWith: 'Test-' } },
    select: {
      id: true,
      name: true,
      category: true,
      isActive: true,
      stock: true,
      createdAt: true,
      dynamicProduct: { select: { id: true, type: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${rows.length} Test-* product(s):\n`);
  console.table(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      isActive: r.isActive,
      stock: r.stock,
      hasDynamic: r.dynamicProduct ? r.dynamicProduct.type : '—',
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());