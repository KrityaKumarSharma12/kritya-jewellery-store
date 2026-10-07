// Resolves the best available product image across all the shapes
// your backend may return (images[], colorMedia[], single image field,
// Cloudinary / S3 URLs, relative /uploads paths, etc.)
//
// Usage:
//   getProductImage(product)
//   getProductImage(product, { color: 'Rose' })  // prefer a specific color's first image

const FALLBACK = '/placeholder.png'; // local file in public/ — must exist

const toAbsolute = (url) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (/^https?:\/\//i.test(url)) return url;      // already absolute
  if (url.startsWith('//')) return `https:${url}`; // protocol-relative
  if (url.startsWith('/')) return url;             // relative to same origin
  return `/${url}`;                                // bare path
};

export function getProductImage(product, opts = {}) {
  if (!product) return FALLBACK;
  const { color } = opts;

  // 1. Prefer colorMedia filtered by color
  if (Array.isArray(product.colorMedia) && product.colorMedia.length > 0) {
    const imagesOnly = product.colorMedia.filter((m) => m?.type !== 'video');
    if (imagesOnly.length > 0) {
      const colorMatch = color
        ? imagesOnly.find((m) => m.color === color)
        : null;
      const pick = colorMatch || imagesOnly[0];
      const url =
        toAbsolute(pick?.url) ||
        toAbsolute(pick?.imageUrl) ||
        toAbsolute(pick?.src) ||
        toAbsolute(pick?.path);
      if (url) return url;
    }
  }

  // 2. Fall back to product.images[]
  if (Array.isArray(product.images) && product.images.length > 0) {
    const url = toAbsolute(product.images[0]);
    if (url) return url;
  }

  // 3. Fall back to single image fields
  const single =
    toAbsolute(product.image) ||
    toAbsolute(product.imageUrl) ||
    toAbsolute(product.thumbnail) ||
    toAbsolute(product.mainImage);
  if (single) return single;

  // 4. Nothing — use local fallback
  return FALLBACK;
}

export default getProductImage;