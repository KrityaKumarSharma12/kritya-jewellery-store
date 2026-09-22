const prisma = require('../lib/prisma');
const { toNum } = require('../lib/decimal');
const couponService = require('./coupon.service');

class OrderService {
  // ============== CREATE ORDER ==============
  async createOrder({ userId, userEmail, shippingAddress, phone, paymentMethod, couponCode, notes }) {
    // 1. Fetch cart
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      const err = new Error('Cart is empty');
      err.statusCode = 400;
      throw err;
    }

    // 2. Calculate subtotal + verify stock
    let subtotal = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });

      if (!product) {
        const err = new Error(`Product ${item.productId} not found`);
        err.statusCode = 404;
        throw err;
      }
      if (product.stock < item.quantity) {
        const err = new Error(`Insufficient stock for ${product.name}`);
        err.statusCode = 400;
        throw err;
      }

      subtotal += toNum(product.price) * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: toNum(product.price),
      });
    }

    // 3. Load store settings
    let taxRate = 3;
    let shippingCost = 0;
    let freeShippingAbove = 5000;
    try {
      const settings = await prisma.storeSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (settings) {
        taxRate = settings.taxRate ?? 3;
        shippingCost = settings.shippingCost ?? 0;
        freeShippingAbove = settings.freeShippingAbove ?? 5000;
      }
    } catch (_) {}

    // 4. Apply coupon (if provided)
    let coupon = null;
    let discount = 0;
    let freeShipping = false;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const found = await couponService.findCouponByCode(couponCode);

      if (!found) {
        const err = new Error('Invalid coupon code');
        err.statusCode = 400;
        throw err;
      }

      const avail = couponService.isCouponAvailable(found);
      if (!avail.ok) {
        const err = new Error(avail.reason);
        err.statusCode = 400;
        throw err;
      }

      const minOrder = found.minOrder != null ? toNum(found.minOrder) : null;
      if (minOrder != null && subtotal < minOrder) {
        const err = new Error(
          `Minimum order of ₹${minOrder.toLocaleString('en-IN')} required for this coupon`
        );
        err.statusCode = 400;
        throw err;
      }

      if (found.perUserLimit != null) {
        const usageCount = await couponService.countUserUsage(found.id, userId);
        if (usageCount >= found.perUserLimit) {
          const err = new Error('You have already used this coupon the maximum number of times');
          err.statusCode = 400;
          throw err;
        }
      }

      discount = couponService.calculateDiscount(found, subtotal);
      freeShipping = found.type === 'FREE_SHIPPING';
      coupon = found;
    }

    // 5. Compute totals
    //
    // NOTE: product.price ALREADY includes GST (the product page shows
    // "Inclusive of all taxes"). We do NOT add tax on top of the subtotal —
    // we only extract the included portion for invoices/reports.
    //
    // Correct math:
    //   customer total = discountedSubtotal + shipping
    //   embedded tax   = discountedSubtotal − (discountedSubtotal / (1 + rate/100))
    const discountedSubtotal = Math.max(0, subtotal - discount);

    let shipping = shippingCost;
    if (discountedSubtotal >= freeShippingAbove || freeShipping) {
      shipping = 0;
    }

    const total = discountedSubtotal + shipping;

    // Extract the GST that's already inside the price (record-keeping only).
    const tax = discountedSubtotal - discountedSubtotal / (1 + taxRate / 100);

    // 6. Transaction: create order + items + payment + coupon usage
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          shippingAddress,
          phone,
          email: userEmail,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: { create: orderItems },
          payment: {
            create: {
              amount: total,
              method: paymentMethod || 'COD',
              status: 'PENDING',
            },
          },
        },
        include: {
          items: {
            include: {
              product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
            },
          },
          payment: true,
        },
      });

      if (coupon && discount > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            orderId: newOrder.id,
            userId,
            discountAmount: discount,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      } else if (coupon && freeShipping) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            orderId: newOrder.id,
            userId,
            discountAmount: 0,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // 7. Save address back to profile (non-fatal)
    if (shippingAddress || phone) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...(shippingAddress ? { address: shippingAddress } : {}),
            ...(phone ? { phone } : {}),
          },
        });
      } catch (err) {
        console.error('Failed to save address to profile:', err);
      }
    }

    // 8. Decrement stock
    for (const item of cartItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 9. Clear cart
    await prisma.cart.deleteMany({ where: { userId } });

    // 10. Auto-generate invoice (non-blocking — never fail the order if this breaks)
    try {
      const invoiceService = require('./invoice.service');
      await invoiceService.generateForOrder(order.id);
    } catch (err) {
      console.error('Auto-invoice generation failed (order still created):', err.message);
    }

    return {
      order,
      summary: {
        subtotal,
        discount,
        tax,
        shipping,
        total,
        couponCode: coupon?.code || null,
      },
    };
  }

  // ============== GET USER ORDERS ==============
  async getUserOrders(userId) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
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

  // ============== GET ORDER BY ID ==============
  async getOrderById(orderId, userId, role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        payment: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.userId !== userId && role !== 'ADMIN') {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    return order;
  }

  // ============== CANCEL ORDER ==============
  async cancelOrder(orderId, userId, role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.userId !== userId && role !== 'ADMIN') {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      const err = new Error('Cannot cancel order at this stage');
      err.statusCode = 400;
      throw err;
    }

    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: {
        items: {
          include: {
            product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        payment: true,
      },
    });
  }

  // ============== CREATE RETURN (customer-initiated) ==============
  async createReturn(orderId, userId, { items, reason, notes }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Please select at least one item to return');
      err.statusCode = 400;
      throw err;
    }

    if (!reason || !reason.trim()) {
      const err = new Error('Please provide a reason for the return');
      err.statusCode = 400;
      throw err;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        returns: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.userId !== userId) {
      const err = new Error('Access denied');
      err.statusCode = 403;
      throw err;
    }

    if (order.status !== 'DELIVERED') {
      const err = new Error('Only delivered orders can be returned');
      err.statusCode = 400;
      throw err;
    }

    const ACTIVE_STATUSES = ['PENDING', 'APPROVED', 'RECEIVED', 'INSPECTING', 'INSPECTED'];
    const existingActive = order.returns.find((r) =>
      ACTIVE_STATUSES.includes(r.status)
    );

    if (existingActive) {
      const err = new Error(
        `This order already has an active return request (#${existingActive.id.slice(-8)})`
      );
      err.statusCode = 400;
      throw err;
    }

    const previouslyReturnedProductIds = new Set();
    order.returns.forEach((ret) => {
      if (ret.status === 'COMPLETED') {
        ret.items.forEach((it) => previouslyReturnedProductIds.add(it.productId));
      }
    });

    const orderItemsById = new Map(order.items.map((it) => [it.productId, it]));
    const returnItems = [];

    for (const reqItem of items) {
      const orderItem = orderItemsById.get(reqItem.productId);
      if (!orderItem) {
        const err = new Error(`Item not found in this order`);
        err.statusCode = 400;
        throw err;
      }

      if (previouslyReturnedProductIds.has(reqItem.productId)) {
        const err = new Error(
          `${orderItem.product?.name || 'Item'} has already been returned`
        );
        err.statusCode = 400;
        throw err;
      }

      const qty = parseInt(reqItem.quantity, 10);
      if (!Number.isFinite(qty) || qty <= 0 || qty > orderItem.quantity) {
        const err = new Error(
          `Invalid return quantity for ${orderItem.product?.name || 'item'}`
        );
        err.statusCode = 400;
        throw err;
      }

      returnItems.push({
        productId: reqItem.productId,
        quantity: qty,
        price: toNum(orderItem.price),
        condition: reqItem.condition || null,
        isAccepted: false,
      });
    }

    const refundAmount = returnItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    const newReturn = await prisma.$transaction(async (tx) => {
      const created = await tx.return.create({
        data: {
          orderId: order.id,
          userId,
          reason,
          status: 'PENDING',
          refundAmount,
          refundStatus: 'PENDING',
          items: {
            create: returnItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
        },
      });

      return created;
    });

    return newReturn;
  }

  // ============== GET USER RETURNS ==============
  async getUserReturns(userId) {
    const returns = await prisma.return.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { colorMedia: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        order: { select: { id: true, total: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return returns.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      reason: r.reason,
      status: r.status,
      inspectionResult: r.inspectionResult,
      refundAmount: toNum(r.refundAmount),
      refundStatus: r.refundStatus,
      returnTrackingNumber: r.returnTrackingNumber,
      receivedAt: r.receivedAt,
      inspectedAt: r.inspectedAt,
      refundedAt: r.refundedAt,
      createdAt: r.createdAt,
      order: r.order
        ? {
            id: r.order.id,
            total: toNum(r.order.total),
            status: r.order.status,
          }
        : null,
      items: (r.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || 'Product',
        image: it.product?.images?.[0] || null,
        quantity: it.quantity,
        price: toNum(it.price),
        condition: it.condition,
        isAccepted: it.isAccepted,
      })),
    }));
  }
}

module.exports = new OrderService();