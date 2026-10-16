const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dyn = await prisma.dynamicProduct.findMany({
    select: {
      id: true,
      productId: true,
      type: true,
      product: { select: { name: true } },
    },
  });

  console.log('\n=== DYNAMIC PRODUCTS ===');
  console.log(JSON.stringify(dyn, null, 2));

  const reg = await prisma.product.findFirst({
    where: { dynamicProduct: { is: null }, isActive: true },
    select: { id: true, name: true, category: true },
  });

  console.log('\n=== A REGULAR PRODUCT ===');
  console.log(JSON.stringify(reg, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());