const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = 'cmvapghao000av3xg14sczxi8';

  const p = await prisma.product.findUnique({
    where: { id },
    include: { dynamicProduct: true },
  });

  if (!p) {
    console.log('Not found:', id);
    return;
  }

  console.log('Deleting product:', p.name, '| category:', p.category);
  if (p.dynamicProduct) {
    console.log('  Also deleting DynamicProduct:', p.dynamicProduct.id);
  }

  // DynamicProduct cascades from Product (onDelete: Cascade in schema)
  await prisma.product.delete({ where: { id } });

  console.log('✅ Deleted.');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());