const prisma = require('../lib/prisma');
const dynamicPricing = require('./dynamicPricing.service');

const VALID_FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

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

  // ============== ✅ NEW: VALIDATE DYNAMIC CONFIGURATION ==============
  //
  // Guards the /api/cart endpoint against malformed configs. Two shapes:
  //   v1 (legacy)  → configuration.ring is a string  → no extra validation
  //   v3 (multi)   → configuration.rings is an array → full validation
  //
  // Throws statusCode 400 with a clear message when invalid.
  // Nothing is written to the DB if this throws.
  _validateDynamicConfiguration(config, dynamicConfig, productName) {
    if (!config || typeof config !== 'object') {
      const err = new Error('Configuration required for this product');
      err.statusCode = 400;
      throw err;
    }

    // Detect shape
    const isV3 = Array.isArray(config.rings);
    if (!isV3) {
      // Legacy v1 shape — nothing to validate here.
      // The engine will handle it as before.
      return;
    }

    // -------- V3 validation --------
    const maxRings = dynamicConfig?.dynamicProduct?.maxRings ?? 5;
    const maxMedallions = dynamicConfig?.dynamicProduct?.maxMedallions ?? 1;
    const components = dynamicConfig?.components || [];

    // Rings array — at least one, at most maxRings
    if (config.rings.length === 0) {
      const err = new Error('Please select at least one ring');
      err.statusCode = 400;
      throw err;
    }
    if (config.rings.length > maxRings) {
      const err = new Error(
        `Too many rings selected: ${config.rings.length} (max ${maxRings})`
      );
      err.statusCode = 400;
      throw err;
    }

    // Each ring: finger + size required, finger must be valid, no duplicates
    const seenFingers = new Set();
    for (let i = 0; i < config.rings.length; i++) {
      const ring = config.rings[i];
      if (!ring || typeof ring !== 'object') {
        const err = new Error(`Ring #${i + 1} is malformed`);
        err.statusCode = 400;
        throw err;
      }
      if (!ring.finger) {
        const err = new Error(`Ring #${i + 1} is missing a finger`);
        err.statusCode = 400;
        throw err;
      }
      if (!VALID_FINGERS.includes(ring.finger)) {
        const err = new Error(
          `Invalid finger "${ring.finger}". Must be one of: ${VALID_FINGERS.join(', ')}`
        );
        err.statusCode = 400;
        throw err;
      }
      if (!ring.size) {
        const err = new Error(
          `Please select a size for the ${ring.finger} ring`
        );
        err.statusCode = 400;
        throw err;
      }
      if (seenFingers.has(ring.finger)) {
        const err = new Error(
          `Duplicate finger "${ring.finger}" — only one ring per finger is allowed`
        );
        err.statusCode = 400;
        throw err;
      }
      seenFingers.add(ring.finger);
    }

    // Medallion
    const medallion = config.medallion || {};
    if (medallion.enabled) {
      if (maxMedallions < 1) {
        const err = new Error('Medallion is not available for this product');
        err.statusCode = 400;
        throw err;
      }
      if (!medallion.styleKey) {
        const err = new Error('Please select a medallion style');
        err.statusCode = 400;
        throw err;
      }
      const validStyleKeys = components
        .filter((c) => c.componentKey === 'medallion')
        .map((c) => c.styleKey);
      if (!validStyleKeys.includes(medallion.styleKey)) {
        const err = new Error(
          `Unknown medallion style "${medallion.styleKey}". Available: ${validStyleKeys.join(', ') || 'none'}`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    // Bracelet — always required for v3 Haath Phool
    const bracelet = config.bracelet || {};
    if (!bracelet.size) {
      const err = new Error('Please select a bracelet size');
      err.statusCode = 400;
      throw err;
    }
  }

  // ============== ENRICH A CART ITEM WITH PRICING ==============
  async _enrichWithPricing(cartItem) {
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

    // Non-dynamic product → original behavior
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

    // Dynamic product → config is required
    if (!configuration || Object.keys(configuration).length === 0) {
      const err = new Error('Configuration required for this product');
      err.statusCode = 400;
      throw err;
    }

    // ✅ NEW: validate the config shape BEFORE computing price.
    //         Throws 400 with a clear message on any malformed input.
    this._validateDynamicConfiguration(configuration, dynamicConfig, product.name);

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

    // Dedupe on (productId + configuration)
    const configKey = JSON.stringify(configuration);

    const candidates = await prisma.cart.findMany({
      where: { userId, productId },
    });
    const existing = candidates.find((c) => {
      if (!c.configuration) return false;
      return JSON.stringify(c.configuration) === configKey;
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

    const embeddedTax =
      subtotal > 0 ? subtotal - subtotal / (1 + taxRate / 100) : 0;

    let shipping = shippingCost;
    if (subtotal >= freeShippingAbove) shipping = 0;

    const total = subtotal + shipping;

    return {
      items,
      summary: {
        subtotal,
        embeddedTax,
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