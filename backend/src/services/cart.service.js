const prisma = require('../lib/prisma');

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

  // ============== CALCULATE CART SUMMARY ==============
  _summarize(cartItems) {
    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    return { total, totalItems };
  }

  // ============== GET CART ==============
  async getCart(userId) {
    const cartItems = await this.fetchCart(userId);
    const { total, totalItems } = this._summarize(cartItems);
    return { items: cartItems, total, totalItems };
  }

  // ============== ADD TO CART ==============
  async addToCart(userId, { productId, quantity = 1 }) {
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

    const existingItem = await prisma.cart.findFirst({
      where: { userId, productId },
    });

    let cartItem;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        const err = new Error('Exceeds available stock');
        err.statusCode = 400;
        throw err;
      }

      cartItem = await prisma.cart.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cart.create({
        data: { userId, productId, quantity },
        include: { product: true },
      });
    }

    const cartItems = await this.fetchCart(userId);
    const { total, totalItems } = this._summarize(cartItems);

    return {
      item: cartItem,
      cart: { items: cartItems, total, totalItems },
    };
  }

  // ============== UPDATE CART ITEM ==============
  async updateCartItem(userId, productId, quantity) {
    if (quantity < 0) {
      const err = new Error('Quantity must be non-negative');
      err.statusCode = 400;
      throw err;
    }

    if (quantity === 0) {
      // Delegate to remove
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

    const cartItems = await this.fetchCart(userId);
    const { total, totalItems } = this._summarize(cartItems);

    return { cart: { items: cartItems, total, totalItems } };
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

    const cartItems = await this.fetchCart(userId);
    const { total, totalItems } = this._summarize(cartItems);

    return { cart: { items: cartItems, total, totalItems } };
  }

  // ============== CLEAR CART ==============
  async clearCart(userId) {
    await prisma.cart.deleteMany({ where: { userId } });
    return { cart: { items: [], total: 0, totalItems: 0 } };
  }

  // ============== GET CART WITH TOTALS ==============
  async getCartWithTotals(userId) {
    const cartItems = await this.fetchCart(userId);

    const settings = await prisma.storeSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const taxRate = settings?.taxRate || 3.0;
    const shippingCost = settings?.shippingCost || 0;
    const freeShippingAbove = settings?.freeShippingAbove || 5000;

    let subtotal = 0;
    let totalItems = 0;

    const items = cartItems.map((item) => {
      const price = item.product.price;
      const total = price * item.quantity;
      subtotal += total;
      totalItems += item.quantity;
      return {
        ...item,
        total,
        product: { ...item.product, price },
      };
    });

    const tax = (subtotal * taxRate) / 100;

    let shipping = shippingCost;
    if (subtotal >= freeShippingAbove) shipping = 0;

    const total = subtotal + tax + shipping;

    return {
      items,
      summary: {
        subtotal,
        tax,
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