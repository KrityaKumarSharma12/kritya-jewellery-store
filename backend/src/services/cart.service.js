const prisma = require('../lib/prisma');
const dynamicPricing = require('./dynamicPricing.service');

class CartService {
  // ============== FETCH CART WITH PRODUCT RELATIONS ==============
  async fetchCart(userId) {
    return prisma.cart.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            colorMedia: { orderBy: { sortOrder: 'asc' } },
            variants: true,
            collection: true,
          },
        },
      },
    });
  }

  // ============== ✅ NEW: ENRICH A CART ITEM WITH PRICING ==============
  //
  // For a regular product: returns product.price as currentPrice.
  // For a dynamic product (has configuration): computes live price
  // and reports lock status (isStale, needsReconfirm, deltaPct).
  async _enrichWithPricing(cartItem) {
    // Not a dynamic product → nothing to compute
    if (!cartItem.configuration) {
      return {
        ...cartItem,
        currentPrice: cartItem.product.price,
        lockedPrice: null,
        lockedAt: null,
        lockedUntil: null,
        isStale: false,
        needsReconfirm: false,
        deltaPct: 0,
        breakdown: null,
      };
    }

    try {
      const result = await dynamicPricing.calculatePriceWithLock({
        productId: cartItem.productId,
        configuration: cartItem.configuration,
        lockedPrice: cartItem.lockedPrice,
        lockedUntil: cartItem.lockedUntil,
      });

      if (!result) {
        // Config was corrupted or dynamic product removed
        return {
          ...cartItem,
          currentPrice: cartItem.product.price,
          lockedPrice: cartItem.lockedPrice ? Number(cartItem.lockedPrice) : null,
          lockedAt: cartItem.lockedAt,
          lockedUntil: cartItem.lockedUntil,
          isStale: false,
          needsReconfirm: false,
          deltaPct: 0,
          breakdown: null,
          configError: 'Dynamic product config not found',
        };
      }

      return {
        ...cartItem,
        currentPrice: result.currentPrice,
        lockedPrice: result.lockedPrice,
        lockedAt: cartItem.lockedAt,
        lockedUntil: cartItem.lockedUntil,
        isStale: result.isStale,
        needsReconfirm: result.needsReconfirm,
        deltaPct: result.deltaPct,
        effectivePrice: result.effectivePrice,
        breakdown: result.breakdown,
      };
    } catch (err) {
      console.error('Error enriching cart item with pricing:', err);
      // Don't crash the whole cart because one item failed — return it with a flag
      return {
        ...cartItem,
        currentPrice: cartItem.product.price,
        lockedPrice: cartItem.lockedPrice ? Number(cartItem.lockedPrice) : null,
        lockedAt: cartItem.lockedAt,
        lockedUntil: cartItem.lockedUntil,
        isStale: false,
        needsReconfirm: false,
        deltaPct: 0,
        breakdown: null,
        pricingError: err.message,
      };
    }
  }

  // ============== CALCULATE CART SUMMARY ==============
  //
  // 🔧 FIX: now uses the enriched `effectivePrice` (or `currentPrice`) per item,
  //         instead of raw product.price * quantity. This correctly sums
  //         dynamic product totals alongside regular products.
  _summarize(cartItems) {
    const total = cartItems.reduce((sum, item) => {
      const unitPrice =
        item.effectivePrice != null
          ? item.effectivePrice
          : item.currentPrice != null
          ? item.currentPrice
          : item.product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return { total, totalItems };
  }

  // ============== GET CART ==============
  async getCart(userId) {
    const rawItems = await this.fetchCart(userId);
    const enrichedItems = await Promise.all(
      rawItems.map((item) => this._enrichWithPricing(item))
    );
    const { total, totalItems } = this._summarize(enrichedItems);
    return { items: enrichedItems, total, totalItems };
  }

  // ============== ADD TO CART ==============
  //
  // ✅ NEW: Accepts `configuration` and `skippedComponents` for dynamic products.
  //         Computes the price, creates a lock, saves both on the cart row.
  async addToCart(userId, { productId, quantity = 1, configuration = null, skippedComponents = [] }) {
    if (!productId) {
      const err = new Error('Product ID required');
      err.statusCode = 400;
      throw err;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }
    if (product.stock < quantity) {
      const err = new Error('Insufficient stock');
      err.statusCode = 400;
      throw err;
    }

    // Detect if this is a dynamic product
    const dynamicConfig = await dynamicPricing.getDynamicProductConfig(productId);

    // 🔧 Non-dynamic product → original behavior (but deduped, so a second add merges)
    if (!dynamicConfig) {
      const existing = await prisma.cart.findFirst({
        where: { userId, productId, configuration: null },
      });

      let cartItem;
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (newQuantity > product.stock) {
          const err = new Error('Exceeds available stock');
          err.statusCode = 400;
          throw err;
        }
        cartItem = await prisma.cart.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
          include: { product: true },
        });
      } else {
        cartItem = await prisma.cart.create({
          data: { userId, productId, quantity },
          include: { product: true },
        });
      }

      const enriched = await this.getCart(userId);
      return { item: cartItem, cart: enriched };
    }

    // ✅ Dynamic product → compute price + create lock
    if (!configuration || Object.keys(configuration).length === 0) {
      const err = new Error('Configuration required for this product');
      err.statusCode = 400;
      throw err;
    }

    const priceResult = await dynamicPricing.calculatePrice(
      productId,
      configuration,
      { skippedComponents }
    );

    if (!priceResult) {
      const err = new Error('Could not compute price for this product');
      err.statusCode = 400;
      throw err;
    }

    const lock = await dynamicPricing.createPriceLock(productId, priceResult.total);

    // Dedupe on (productId + configuration + skippedComponents)
    // Merge into one row if the exact same config is added twice.
    const configKey = JSON.stringify(configuration);
    const skippedKey = JSON.stringify(skippedComponents.sort());

    const candidates = await prisma.cart.findMany({
      where: { userId, productId },
    });
    const existing = candidates.find((c) => {
      if (!c.configuration) return false;
      const sameConfig = JSON.stringify(c.configuration) === configKey;
      // skippedComponents isn't stored on cart yet, so we compare config only
      return sameConfig;
    });

    let cartItem;
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > product.stock) {
        const err = new Error('Exceeds available stock');
        err.statusCode = 400;
        throw err;
      }
      // Refresh the lock — customer is re-adding, so restart the timer
      cartItem = await prisma.cart.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity,
          lockedPrice: lock.lockedPrice,
          lockedAt: lock.lockedAt,
          lockedUntil: lock.lockedUntil,
        },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cart.create({
        data: {
          userId,
          productId,
          quantity,
          configuration,
          lockedPrice: lock.lockedPrice,
          lockedAt: lock.lockedAt,
          lockedUntil: lock.lockedUntil,
        },
        include: { product: true },
      });
    }

    const enriched = await this.getCart(userId);
    return { item: cartItem, cart: enriched };
  }

  // ============== UPDATE CART ITEM ==============
  async updateCartItem(userId, productId, quantity) {
    if (quantity < 0) {
      const err = new Error('Quantity must be non-negative');
      err.statusCode = 400;
      throw err;
    }

    if (quantity === 0) {
      return this.removeFromCart(userId, productId);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }
    if (product.stock < quantity) {
      const err = new Error('Insufficient stock');
      err.statusCode = 400;
      throw err;
    }

    const result = await prisma.cart.updateMany({
      where: { userId, productId },
      data: { quantity },
    });

    if (result.count === 0) {
      const err = new Error('Item not found in cart');
      err.statusCode = 404;
      throw err;
    }

    return { cart: await this.getCart(userId) };
  }

  // ============== REMOVE FROM CART ==============
  async removeFromCart(userId, productId) {
    const result = await prisma.cart.deleteMany({
      where: { userId, productId },
    });

    if (result.count === 0) {
      const err = new Error('Item not found in cart');
      err.statusCode = 404;
      throw err;
    }

    return { cart: await this.getCart(userId) };
  }

  // ============== CLEAR CART ==============
  async clearCart(userId) {
    await prisma.cart.deleteMany({ where: { userId } });
    return { cart: { items: [], total: 0, totalItems: 0 } };
  }

  // ============== GET CART WITH TOTALS ==============
  //
  // 🔧 FIX: previously computed tax on top of subtotal (double-counted GST).
  //         Now extracts the embedded tax (informational only).
  async getCartWithTotals(userId) {
    const cartItems = await this.fetchCart(userId);
    const enrichedItems = await Promise.all(
      cartItems.map((item) => this._enrichWithPricing(item))
    );

    const settings = await prisma.storeSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const taxRate = settings?.taxRate || 3.0;
    const shippingCost = settings?.shippingCost || 0;
    const freeShippingAbove = settings?.freeShippingAbove || 5000;

    let subtotal = 0;
    let totalItems = 0;

    const items = enrichedItems.map((item) => {
      const unitPrice =
        item.effectivePrice != null
          ? item.effectivePrice
          : item.currentPrice != null
          ? item.currentPrice
          : item.product.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      totalItems += item.quantity;
      return {
        ...item,
        unitPrice,
        total: lineTotal,
      };
    });

    // 🔧 FIX: GST is already included in the price. Extract it, don't add it.
    // embeddedTax = subtotal − subtotal / (1 + rate/100)
    const embeddedTax =
      subtotal > 0 ? subtotal - subtotal / (1 + taxRate / 100) : 0;

    // Shipping is added on top (it's not a taxable item)
    let shipping = shippingCost;
    if (subtotal >= freeShippingAbove) shipping = 0;

    // Customer pays: subtotal + shipping. GST is inside subtotal.
    const total = subtotal + shipping;

    return {
      items,
      summary: {
        subtotal,
        embeddedTax, // informational — not added to the total
        taxRate,
        shipping,
        total,
        totalItems,
        freeShippingAbove,
        isEligibleForFreeShipping: subtotal >= freeShippingAbove,
      },
      settings: { taxRate, shippingCost, freeShippingAbove },
    };
  }
}

module.exports = new CartService();