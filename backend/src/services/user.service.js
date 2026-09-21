const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { toNum } = require('../lib/decimal');

class UserService {
  // ============== GET PROFILE ==============
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return user;
  }

  // ============== UPDATE PROFILE ==============
  async updateProfile(userId, { name, phone, address }) {
    return prisma.user.update({
      where: { id: userId },
      data: { name, phone, address },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
      },
    });
  }

  // ============== CHANGE PASSWORD ==============
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      const err = new Error('Current password is incorrect');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  // ============== GET USER ORDERS ==============
  async getOrders(userId) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        payment: true,
        returns: {
          select: {
            id: true,
            status: true,
            refundAmount: true,
            refundStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      total: toNum(o.total),
      returns: (o.returns || []).map((r) => ({
        ...r,
        refundAmount: toNum(r.refundAmount),
      })),
    }));
  }

  // ============== WISHLIST (uses WishlistItem) ==============

  // GET WISHLIST
  async getWishlist(userId) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    // Serialize product.price (Decimal → number) so the frontend can .toLocaleString() safely
    return items.map((it) => ({
      id: it.id,
      userId: it.userId,
      productId: it.productId,
      variantId: it.variantId || null,
      addedAt: it.addedAt,
      product: it.product
        ? {
            ...it.product,
            price: toNum(it.product.price),
          }
        : null,
    }));
  }

  // ADD TO WISHLIST
  async addToWishlist(userId, productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const existing = await prisma.wishlistItem.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      const err = new Error('Product already in wishlist');
      err.statusCode = 400;
      throw err;
    }

    const created = await prisma.wishlistItem.create({
      data: { userId, productId },
      include: {
        product: {
          include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      productId: created.productId,
      variantId: created.variantId || null,
      addedAt: created.addedAt,
      product: created.product
        ? { ...created.product, price: toNum(created.product.price) }
        : null,
    };
  }

  // REMOVE FROM WISHLIST
  async removeFromWishlist(userId, productId) {
    const result = await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });

    if (result.count === 0) {
      const err = new Error('Item not found in wishlist');
      err.statusCode = 404;
      throw err;
    }
  }
}

module.exports = new UserService();