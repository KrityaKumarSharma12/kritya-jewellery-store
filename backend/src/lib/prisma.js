const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// ============================================================
// Auto-merge colorMedia URLs into product.images[]
//
// This runs on EVERY query that returns a Product (or a nested
// Product inside Order.items, Cart, Wishlist, etc.). If the
// product has colorMedia images, they get copied into images[]
// so all frontends that read product.images[0] just work.
// ============================================================
function mergeProductImages(product) {
  if (!product || typeof product !== 'object') return product;

  // If the product doesn't have colorMedia loaded, don't touch it.
  // The original images[] is whatever it was.
  if (!Array.isArray(product.colorMedia)) {
    return product;
  }

  const colorMediaUrls = product.colorMedia
    .filter((m) => m.type === 'image' || !m.type)
    .map((m) => m.url);

  const existingImages = Array.isArray(product.images) ? product.images : [];
  const mergedImages = colorMediaUrls.length > 0 ? colorMediaUrls : existingImages;

  return {
    ...product,
    images: mergedImages,
  };
}

// Recursively walk a result and merge any object that looks like a Product
function deepMergeProducts(value) {
  if (value == null) return value;

  // Array — recurse into each item
  if (Array.isArray(value)) {
    return value.map(deepMergeProducts);
  }

  // Primitives (string, number, boolean, Date) — return as-is
  if (typeof value !== 'object') return value;

  // Date — return as-is
  if (value instanceof Date) return value;

  // Object — first recurse into children, then merge if it's a product
  const walked = {};
  for (const key of Object.keys(value)) {
    walked[key] = deepMergeProducts(value[key]);
  }

  // Heuristic: an object is a "product" if it has `images` AND
  // `price` AND `category` fields (all products do). We check
  // `images` in particular so we don't accidentally touch other types.
  const looksLikeProduct =
    'images' in walked &&
    'price' in walked &&
    'category' in walked;

  return looksLikeProduct ? mergeProductImages(walked) : walked;
}

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(args);
        return deepMergeProducts(result);
      },
    },
  },
});

module.exports = prisma;