const prisma = require('../lib/prisma');
const { toNum } = require('../lib/decimal');

// Force a value to a safe, finite JS number. Throws if it can't.
function safeNum(val, label) {
  const n = Number(toNum(val));
  if (!Number.isFinite(n)) {
    throw new Error(`Non-finite number for ${label}: ${JSON.stringify(val)}`);
  }
  return Math.round(n * 100) / 100; // round to paise
}

class InvoiceService {
  /**
   * Generate an invoice for a single order.
   * Idempotent — if an invoice already exists for the order, returns it.
   */
  async generateForOrder(orderId) {
    // 1. Load the order with everything needed
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true, phone: true } },
        payment: true,
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Idempotency
    const existing = await prisma.invoice.findUnique({ where: { orderId } });
    if (existing) return this._serialize(existing);

    // 3. Item snapshot — every field forced through safeNum
    const itemsSnapshot = order.items.map((it) => {
      const price = safeNum(it.price, `item.price (${it.productId})`);
      const qty = Number(it.quantity) || 0;
      const lineTotal = Math.round(price * qty * 100) / 100;
      return {
        productId: it.productId,
        name: it.product?.name || 'Product',
        quantity: qty,
        price,
        total: lineTotal,
        hsn: '7113',
      };
    });

    // 4. Load taxRate from settings — force through safeNum too
    let taxRatePct = 3;
    try {
      const settings = await prisma.storeSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (settings && settings.taxRate != null) {
        const parsed = safeNum(settings.taxRate, 'settings.taxRate');
        if (parsed >= 0 && parsed < 100) taxRatePct = parsed;
      }
    } catch (_) { /* keep default */ }

    // 5. Compute totals — all plain JS numbers
    const subtotal = Math.round(
      itemsSnapshot.reduce((s, i) => s + i.total, 0) * 100
    ) / 100;

    const tax = Math.round(subtotal * (taxRatePct / 100) * 100) / 100;

    // Read store settings for shipping/free threshold
    let shippingCost = 0;
    let freeShippingAbove = 5000;
    try {
      const settings = await prisma.storeSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (settings) {
        if (settings.shippingCost != null)
          shippingCost = safeNum(settings.shippingCost, 'settings.shippingCost');
        if (settings.freeShippingAbove != null)
          freeShippingAbove = safeNum(settings.freeShippingAbove, 'settings.freeShippingAbove');
      }
    } catch (_) {}

    const shipping = subtotal >= freeShippingAbove ? 0 : shippingCost;

    // Discount comes from coupon usage (if any) — never from order.total
    let discount = 0;
    try {
      const usage = await prisma.couponUsage.findFirst({
        where: { orderId: order.id },
        select: { discountAmount: true },
      });
      if (usage?.discountAmount != null) {
        discount = safeNum(usage.discountAmount, 'couponUsage.discountAmount');
      }
    } catch (_) {}

    // Total is RECOMPUTED, not read from order.total
    const total = Math.round((subtotal - discount + tax + shipping) * 100) / 100;

    // Dev sanity log
    if (process.env.NODE_ENV !== 'production') {
      console.log('[invoice] computed:', {
        orderId: order.id,
        itemCount: itemsSnapshot.length,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        taxRatePct,
        types: {
          subtotal: typeof subtotal,
          tax: typeof tax,
          total: typeof total,
        },
      });
    }

    // 6. Sequential invoice number
    const invoiceNumber = await this._nextInvoiceNumber();

    // 7. Persist
    const created = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        customerName: order.user?.name || 'Guest',
        customerEmail: order.user?.email || order.email || '',
        customerPhone: order.user?.phone || order.phone || null,
        customerAddress: order.shippingAddress || null,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        paymentMethod: order.payment?.method || order.paymentMethod || null,
        paymentStatus: order.payment?.status || order.paymentStatus || null,
        items: itemsSnapshot,
      },
    });

    return this._serialize(created);
  }

  /**
   * Sequential invoice numbers: INV-2026-000001
   */
  async _nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const last = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextSeq = 1;
    if (last?.invoiceNumber) {
      const parts = last.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (Number.isFinite(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  }

  /**
   * List invoices with filters + pagination.
   */
  async list({ search, status, from, to, page = 1, limit = 20 } = {}) {
    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { orderId: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status) where.paymentStatus = status;

    if (from || to) {
      where.generatedAt = {};
      if (from) where.generatedAt.gte = new Date(from);
      if (to) where.generatedAt.lte = new Date(to);
    }

    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices: rows.map((r) => this._serialize(r)),
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  /**
   * Fetch one invoice (serialized).
   */
  async getById(id) {
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }
    return this._serialize(inv);
  }

  /**
   * Backfill invoices for all delivered/paid orders that don't have one.
   */
  async backfill() {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] },
        invoice: null,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const results = [];
    for (const { id } of orders) {
      try {
        const inv = await this.generateForOrder(id);
        results.push({ orderId: id, invoiceNumber: inv.invoiceNumber, ok: true });
      } catch (err) {
        results.push({ orderId: id, ok: false, error: err.message });
      }
    }

    return results;
  }

  /**
   * Serialize a Prisma row for JSON — force every Decimal to a number.
   */
  _serialize(row) {
    const items = Array.isArray(row.items)
      ? row.items.map((it) => ({
          ...it,
          price: Number(toNum(it.price)),
          total: Number(toNum(it.total)),
          quantity: Number(it.quantity) || 0,
        }))
      : row.items;

    return {
      ...row,
      items,
      subtotal: Number(toNum(row.subtotal)),
      discount: Number(toNum(row.discount)),
      tax: Number(toNum(row.tax)),
      shipping: Number(toNum(row.shipping)),
      total: Number(toNum(row.total)),
    };
  }
}

module.exports = new InvoiceService();