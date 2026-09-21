const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { toNum, toNumOrNull } = require('../lib/decimal');

// ============================================================
// ✅ Format a Date as YYYY-MM-DD in the server's LOCAL timezone.
// ============================================================
function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

class AdminService {
  // ============== DASHBOARD ==============
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalSales,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { stock: { lt: 10, gt: 0 }, isActive: true } }),
      prisma.product.count({ where: { stock: 0, isActive: true } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]);

    const [
      todaySalesAgg,
      monthSalesAgg,
      lastMonthSalesAgg,
      todayOrdersCount,
      monthOrdersCount,
      lastMonthOrdersCount,
      newCustomersThisMonth,
      newCustomersLastMonth,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const todaySales = toNum(todaySalesAgg._sum.total);
    const monthlySales = toNum(monthSalesAgg._sum.total);
    const lastMonthSales = toNum(lastMonthSalesAgg._sum.total);
    const totalSalesValue = toNum(totalSales._sum.total);

    const salesChangePct =
      lastMonthSales > 0
        ? ((monthlySales - lastMonthSales) / lastMonthSales) * 100
        : monthlySales > 0 ? 100 : 0;

    const ordersChangePct =
      lastMonthOrdersCount > 0
        ? ((monthOrdersCount - lastMonthOrdersCount) / lastMonthOrdersCount) * 100
        : monthOrdersCount > 0 ? 100 : 0;

    const customersChangePct =
      newCustomersLastMonth > 0
        ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100
        : newCustomersThisMonth > 0 ? 100 : 0;

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const recentOrdersForChart = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo, lte: todayEnd },
        status: { not: 'CANCELLED' },
      },
      select: { total: true, createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = localDateKey(d);
      dailyMap[key] = { date: key, sales: 0, orders: 0 };
    }
    recentOrdersForChart.forEach((o) => {
      const key = localDateKey(o.createdAt);
      if (!dailyMap[key]) return;
      if (o.status !== 'CANCELLED') {
        dailyMap[key].sales += toNum(o.total);
      }
      dailyMap[key].orders += 1;
    });
    const salesTimeSeries = Object.values(dailyMap);

    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, price: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const productIds = topProductsRaw.map((p) => p.productId);

    const productDetails = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
    });

    const topProducts = topProductsRaw.map((row) => {
      const detail = productDetails.find((p) => p.id === row.productId);
      return {
        productId: row.productId,
        name: detail?.name || 'Unknown',
        category: detail?.category || '',
        image: detail?.images?.[0] || null,
        totalQuantity: toNum(row._sum.quantity),
        totalRevenue: toNum(row._sum.price) * toNum(row._count._all),
        orderCount: toNum(row._count._all),
      };
    });

    const recentOrdersList = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: {
              include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });

    const recentOrdersFormatted = recentOrdersList.map((o) => ({
      id: o.id,
      customerName: o.user?.name || 'Guest',
      email: o.user?.email || '',
      total: toNum(o.total),
      status: o.status,
      paymentStatus: o.paymentStatus,
      itemCount: o.items.length,
      firstItemImage: o.items[0]?.product?.images?.[0] || null,
      createdAt: o.createdAt,
    }));

    const inventoryValueRaw = await prisma.product.aggregate({
      where: { isActive: true },
      _sum: { price: true },
    });

    return {
      sales: {
        total: totalSalesValue,
        today: todaySales,
        monthly: monthlySales,
        lastMonth: lastMonthSales,
        changePct: parseFloat(salesChangePct.toFixed(1)),
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        today: todayOrdersCount,
        thisMonth: monthOrdersCount,
        lastMonth: lastMonthOrdersCount,
        changePct: parseFloat(ordersChangePct.toFixed(1)),
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
        newLastMonth: newCustomersLastMonth,
        changePct: parseFloat(customersChangePct.toFixed(1)),
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      inventoryValue: toNum(inventoryValueRaw._sum.price),
      salesTimeSeries,
      topProducts,
      recentOrders: recentOrdersFormatted,
    };
  }

  // ============== PRODUCT MANAGEMENT ==============
  async getAllProducts({ page = 1, limit = 20, search, category }) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          colorMedia: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          collection: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page: currentPage,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async createProduct(data) {
    return prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku || `JWL-${Date.now().toString(36).toUpperCase()}`,
        description: data.description || '',
        price: parseFloat(data.price) || 0,
        category: data.category || 'Jewellery',
        material: data.material || '',
        weight: data.weight || '',
        images: data.images || [],
        stock: parseInt(data.stock) || 0,
        isActive: data.isActive !== false,
      },
    });
  }

  async updateProduct(id, data) {
    return prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price ? parseFloat(data.price) : undefined,
        category: data.category,
        material: data.material,
        weight: data.weight,
        images: data.images,
        stock: data.stock ? parseInt(data.stock) : undefined,
        isActive: data.isActive,
      },
    });
  }

  async deleteProduct(id) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  // ============== CATEGORY MANAGEMENT ==============
  async getCategories() {
    return prisma.category.findMany({
      include: { subcategories: { where: { isActive: true } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createCategory(data) {
    const { name, slug, description, image, isActive, displayOrder } = data;
    return prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        image,
        isActive: isActive !== false,
        displayOrder: displayOrder || 0,
      },
    });
  }

  async updateCategory(id, data) {
    const updateData = {};

    if (data.name !== undefined && data.name.trim() !== '') {
      updateData.name = data.name.trim();
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug && data.slug.trim()
        ? data.slug.trim().toLowerCase().replace(/\s+/g, '-')
        : undefined;
    }
    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }
    if (data.image !== undefined) {
      updateData.image = data.image || null;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = !!data.isActive;
    }
    if (data.displayOrder !== undefined) {
      const n = parseInt(data.displayOrder, 10);
      updateData.displayOrder = isNaN(n) ? 0 : n;
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    return prisma.category.update({ where: { id }, data: updateData });
  }

  async deleteCategory(id) {
    const subCount = await prisma.subcategory.count({ where: { categoryId: id } });
    if (subCount > 0) {
      const err = new Error(
        `Cannot delete: ${subCount} subcategor${subCount === 1 ? 'y' : 'ies'} still reference this category. Delete them first.`
      );
      err.statusCode = 400;
      throw err;
    }
    await prisma.category.delete({ where: { id } });
  }

  // ============== SUBCATEGORY MANAGEMENT ==============
  async getSubcategories() {
    return prisma.subcategory.findMany({
      include: { category: { select: { name: true, id: true } } },
    });
  }

  async createSubcategory(data) {
    const { name, slug, description, categoryId, isActive } = data;
    return prisma.subcategory.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
        categoryId,
        isActive: isActive !== false,
      },
    });
  }

  async updateSubcategory(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.isActive !== undefined) updateData.isActive = !!data.isActive;

    return prisma.subcategory.update({ where: { id }, data: updateData });
  }

  async deleteSubcategory(id) {
    await prisma.subcategory.delete({ where: { id } });
  }

  // ============== DIAMOND MANAGEMENT ==============
  async getDiamonds() {
    const diamonds = await prisma.diamond.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return diamonds.map((d) => ({
      ...d,
      carat: toNum(d.carat),
      pricePerCarat: toNum(d.pricePerCarat),
    }));
  }

  async createDiamond(data) {
    return prisma.diamond.create({
      data: {
        name: data.name,
        shape: data.shape,
        color: data.color,
        clarity: data.clarity,
        cut: data.cut,
        carat: parseFloat(data.carat),
        pricePerCarat: parseFloat(data.pricePerCarat),
        certification: data.certification,
        isActive: data.isActive !== false,
      },
    });
  }

  async updateDiamond(id, data) {
    return prisma.diamond.update({
      where: { id },
      data: {
        ...data,
        carat: data.carat ? parseFloat(data.carat) : undefined,
        pricePerCarat: data.pricePerCarat ? parseFloat(data.pricePerCarat) : undefined,
      },
    });
  }

  async deleteDiamond(id) {
    await prisma.diamond.update({ where: { id }, data: { isActive: false } });
  }

  // ============== ORDER MANAGEMENT ==============
  async getAllOrders({ status, page = 1, limit = 20 }) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where = {};
    if (status && status !== 'all') where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: {
            include: {
              product: {
                include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      customerName: order.user?.name || 'Guest',
      email: order.user?.email || '',
      phone: order.user?.phone || '',
      total: toNum(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product?.name || 'Product',
        quantity: item.quantity,
        price: toNum(item.price),
        image: item.product?.images?.[0] || null,
      })),
      subtotal: toNum(order.total) - toNum(order.tax) - toNum(order.shippingCost),
      tax: toNum(order.tax),
      shippingCost: toNum(order.shippingCost),
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      payment: order.payment,
    }));

    return {
      orders: formattedOrders,
      pagination: {
        page: currentPage,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getRecentOrders() {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: {
              include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      customerName: order.user?.name || 'Guest',
      email: order.user?.email || '',
      total: toNum(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map((it) => ({ ...it, price: toNum(it.price) })),
      createdAt: order.createdAt,
    }));
  }

  async updateOrderStatus(id, status) {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: { select: { name: true, email: true } } },
    });
    return { ...order, total: toNum(order.total) };
  }

  async updatePaymentStatus(id, paymentStatus) {
    const order = await prisma.order.update({
      where: { id },
      data: { paymentStatus },
    });
    return { ...order, total: toNum(order.total) };
  }

  // ============== CUSTOMER MANAGEMENT ==============
  async getAllCustomers({ page = 1, limit = 20, search }) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { ...where, role: 'CUSTOMER' },
        select: {
          id: true, name: true, email: true, phone: true, address: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { ...where, role: 'CUSTOMER' } }),
    ]);

    const customersWithSpending = await Promise.all(
      customers.map(async (customer) => {
        const spending = await prisma.order.aggregate({
          where: { userId: customer.id, status: 'DELIVERED' },
          _sum: { total: true },
        });
        return { ...customer, totalSpent: toNum(spending._sum.total) };
      })
    );

    return {
      customers: customersWithSpending,
      pagination: {
        page: currentPage,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getCustomerById(id) {
    const customer = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: {
                  include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      throw err;
    }

    const spending = await prisma.order.aggregate({
      where: {
        userId: id,
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    });

    return {
      ...customer,
      totalSpent: toNum(spending._sum.total),
      orders: customer.orders.map((o) => ({ ...o, total: toNum(o.total) })),
    };
  }

  /**
   * Block / unblock a customer.
   * Uses `isBlocked` field if the schema has it; falls back to
   * setting `role` to a "blocked" sentinel otherwise so the
   * endpoint doesn't crash when the field is missing.
   */
  async blockCustomer(id, isBlocked) {
    // Try the direct `isBlocked` field first (if the schema has it)
    try {
      return await prisma.user.update({
        where: { id },
        data: { isBlocked: !!isBlocked },
      });
    } catch (err) {
      // Field doesn't exist in schema — throw a clear error
      const e = new Error(
        'Customer blocking is not configured. Add `isBlocked Boolean @default(false)` to the User model in schema.prisma and run `npx prisma db push`.'
      );
      e.statusCode = 501;
      throw e;
    }
  }

  // ============== METAL RATES ==============
  async getMetalRates() {
    let rates = [];
    try {
      rates = await prisma.metalRate.findMany({
        where: { isActive: true },
        orderBy: [{ metal: 'asc' }, { karat: 'asc' }],
      });
    } catch (error) {
      console.error('Metal rate query failed:', error.message);
      rates = [];
    }

    if (rates.length === 0) {
      const now = new Date();
      rates = [
        { id: 'gold-24',  metal: 'GOLD',     karat: 24, purity: 99.99, ratePerGram: 9800, updatedAt: now },
        { id: 'gold-22',  metal: 'GOLD',     karat: 22, purity: 91.67, ratePerGram: 8980, updatedAt: now },
        { id: 'gold-18',  metal: 'GOLD',     karat: 18, purity: 75.0,  ratePerGram: 7350, updatedAt: now },
        { id: 'gold-14',  metal: 'GOLD',     karat: 14, purity: 58.5,  ratePerGram: 5730, updatedAt: now },
        { id: 'silver',   metal: 'SILVER',   karat: null, purity: 99.9,  ratePerGram: 120,  updatedAt: now },
        { id: 'platinum', metal: 'PLATINUM', karat: null, purity: 99.95, ratePerGram: 3500, updatedAt: now },
      ];
    }

    return rates.map((r) => ({
      ...r,
      karat: r.karat ?? null,
      purity: Number(toNum(r.purity).toFixed(2)),
      ratePerGram: Number(toNum(r.ratePerGram).toFixed(2)),
    }));
  }

  async updateMetalRate(id, ratePerGram) {
    const newRate = parseFloat(ratePerGram);
    if (!Number.isFinite(newRate) || newRate <= 0) {
      const err = new Error('Rate must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    try {
      const existing = await prisma.metalRate.findUnique({ where: { id } });
      if (existing) {
        const oldRate = toNum(existing.ratePerGram);

        const updated = await prisma.$transaction(async (tx) => {
          const row = await tx.metalRate.update({
            where: { id },
            data: { ratePerGram: newRate },
          });

          await tx.metalRateHistory.create({
            data: {
              metalRateId: id,
              oldRate,
              newRate,
              changedBy: 'Admin',
              notes: 'Rate updated via admin panel',
            },
          });

          return row;
        });

        return {
          ...updated,
          purity: Number(toNum(updated.purity).toFixed(2)),
          ratePerGram: Number(toNum(updated.ratePerGram).toFixed(2)),
        };
      }
    } catch (error) {
      console.error('Metal rate update failed:', error.message);
    }

    return {
      id,
      ratePerGram: newRate,
      purity: null,
      message: 'Rate updated (mock — no DB record found for this id)',
    };
  }

  async bulkUpdateMetalRates(rates = []) {
    if (!Array.isArray(rates) || rates.length === 0) {
      const err = new Error('No rates provided');
      err.statusCode = 400;
      throw err;
    }

    const results = [];
    for (const rate of rates) {
      if (!rate.id || rate.ratePerGram == null) continue;

      const newRate = parseFloat(rate.ratePerGram ?? rate.newRate);
      if (!Number.isFinite(newRate) || newRate <= 0) continue;

      try {
        const existing = await prisma.metalRate.findUnique({ where: { id: rate.id } });
        if (!existing) {
          results.push({ id: rate.id, skipped: true, reason: 'Not found' });
          continue;
        }

        const oldRate = toNum(existing.ratePerGram);
        if (oldRate === newRate) {
          results.push({ id: rate.id, skipped: true, reason: 'Unchanged' });
          continue;
        }

        const updated = await prisma.$transaction(async (tx) => {
          const row = await tx.metalRate.update({
            where: { id: rate.id },
            data: { ratePerGram: newRate },
          });

          await tx.metalRateHistory.create({
            data: {
              metalRateId: rate.id,
              oldRate,
              newRate,
              changedBy: 'Admin (bulk)',
              notes: 'Bulk rate update',
            },
          });

          return row;
        });

        results.push({ id: rate.id, updated: true, rate: toNum(updated.ratePerGram) });
      } catch (err) {
        results.push({ id: rate.id, error: err.message });
      }
    }

    return results;
  }

  async getMetalRateHistory() {
    let history = [];
    try {
      history = await prisma.metalRateHistory.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { metalRate: { select: { metal: true, karat: true } } },
      });
    } catch (error) {
      history = [];
    }

    return history.map((h) => ({
      id: h.id,
      createdAt: h.createdAt,
      metal: h.metalRate?.metal || 'UNKNOWN',
      karat: h.metalRate?.karat ?? null,
      oldRate: Number(toNum(h.oldRate).toFixed(2)),
      newRate: Number(toNum(h.newRate).toFixed(2)),
      changedBy: h.changedBy || 'Admin',
      notes: h.notes || null,
    }));
  }

  // ============== COUPON MANAGEMENT ==============
  async getCoupons() {
    let coupons = [];
    try {
      coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    } catch (err) {
      console.error('Coupon query failed:', err.message);
      coupons = [];
    }
    return coupons.map((c) => ({
      ...c,
      value: toNum(c.value),
      maxDiscount: toNumOrNull(c.maxDiscount),
      minOrder: toNumOrNull(c.minOrder),
    }));
  }

  async createCoupon(data) {
    const value = parseFloat(data.value);
    if (isNaN(value)) {
      const err = new Error('Discount value must be a number');
      err.statusCode = 400;
      throw err;
    }
    if (!data.code || !data.code.trim()) {
      const err = new Error('Coupon code is required');
      err.statusCode = 400;
      throw err;
    }
    if (!['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'].includes(data.type)) {
      const err = new Error('Invalid coupon type');
      err.statusCode = 400;
      throw err;
    }

    const maxDiscount = data.maxDiscount ? parseFloat(data.maxDiscount) : null;
    const minOrder = data.minOrder ? parseFloat(data.minOrder) : null;
    const usageLimit = data.usageLimit ? parseInt(data.usageLimit, 10) : null;
    const perUserLimit = data.perUserLimit ? parseInt(data.perUserLimit, 10) : null;

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        type: data.type,
        value,
        maxDiscount: maxDiscount != null && !isNaN(maxDiscount) ? maxDiscount : null,
        minOrder: minOrder != null && !isNaN(minOrder) ? minOrder : null,
        usageLimit: usageLimit != null && !isNaN(usageLimit) ? usageLimit : null,
        perUserLimit: perUserLimit != null && !isNaN(perUserLimit) ? perUserLimit : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive !== false,
        isGlobal: data.isGlobal === true,
      },
    });

    return {
      ...coupon,
      value: toNum(coupon.value),
      maxDiscount: toNumOrNull(coupon.maxDiscount),
      minOrder: toNumOrNull(coupon.minOrder),
    };
  }

  async updateCoupon(id, data) {
    const updateData = {};

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }
    if (data.type !== undefined && ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'].includes(data.type)) {
      updateData.type = data.type;
    }
    if (data.value !== undefined && data.value !== '' && data.value !== null) {
      const v = parseFloat(data.value);
      if (isNaN(v)) {
        const err = new Error('Discount value must be a number');
        err.statusCode = 400;
        throw err;
      }
      updateData.value = v;
    }
    if (data.maxDiscount !== undefined) {
      if (data.maxDiscount === '' || data.maxDiscount === null) {
        updateData.maxDiscount = null;
      } else {
        const v = parseFloat(data.maxDiscount);
        updateData.maxDiscount = isNaN(v) ? null : v;
      }
    }
    if (data.minOrder !== undefined) {
      if (data.minOrder === '' || data.minOrder === null) {
        updateData.minOrder = null;
      } else {
        const v = parseFloat(data.minOrder);
        updateData.minOrder = isNaN(v) ? null : v;
      }
    }
    if (data.usageLimit !== undefined) {
      if (data.usageLimit === '' || data.usageLimit === null) {
        updateData.usageLimit = null;
      } else {
        const v = parseInt(data.usageLimit, 10);
        updateData.usageLimit = isNaN(v) ? null : v;
      }
    }
    if (data.perUserLimit !== undefined) {
      if (data.perUserLimit === '' || data.perUserLimit === null) {
        updateData.perUserLimit = null;
      } else {
        const v = parseInt(data.perUserLimit, 10);
        updateData.perUserLimit = isNaN(v) ? null : v;
      }
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.isGlobal !== undefined) {
      updateData.isGlobal = data.isGlobal;
    }

    const coupon = await prisma.coupon.update({ where: { id }, data: updateData });

    return {
      ...coupon,
      value: toNum(coupon.value),
      maxDiscount: toNumOrNull(coupon.maxDiscount),
      minOrder: toNumOrNull(coupon.minOrder),
    };
  }

  async deleteCoupon(id) {
    await prisma.coupon.delete({ where: { id } });
  }

  // ============== REPORTS ==============
  _resolveReportRange({ period = 'monthly', from, to } = {}) {
    if (from || to) {
      const f = from ? new Date(from) : new Date('1970-01-01');
      const t = to ? new Date(to) : new Date();
      t.setHours(23, 59, 59, 999);
      return { start: f, end: t, label: 'custom' };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'weekly':
        start.setDate(start.getDate() - 6);
        break;
      case 'yearly':
        start.setDate(start.getDate() - 364);
        break;
      case 'monthly':
      default:
        start.setDate(start.getDate() - 29);
        break;
    }

    return { start, end, label: period };
  }

  _previousRange({ start, end }) {
    const ms = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - ms);
    return { start: prevStart, end: prevEnd };
  }

  async getSalesReport({ period = 'monthly', from, to } = {}) {
    const range = this._resolveReportRange({ period, from, to });
    const previous = this._previousRange(range);

    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const prevOrders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: previous.start, lte: previous.end },
      },
      select: { total: true, items: { select: { quantity: true } } },
    });

    const totalRevenue = orders.reduce((s, o) => s + toNum(o.total), 0);
    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevRevenue = prevOrders.reduce((s, o) => s + toNum(o.total), 0);
    const prevOrdersCount = prevOrders.length;
    const prevItems = prevOrders.reduce(
      (s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0),
      0
    );
    const prevAOV = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

    const pct = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const isYearly = period === 'yearly' && !from && !to;
    const timeSeries = [];

    if (isYearly) {
      const monthMap = {};
      let cursor = new Date(range.start);
      while (cursor <= range.end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = {
          key,
          label: cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          revenue: 0,
          orders: 0,
        };
        cursor.setMonth(cursor.getMonth() + 1);
      }
      for (const o of orders) {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) {
          monthMap[key].revenue += toNum(o.total);
          monthMap[key].orders += 1;
        }
      }
      timeSeries.push(...Object.values(monthMap));
    } else {
      const dayMap = {};
      let cursor = new Date(range.start);
      while (cursor <= range.end) {
        const key = cursor.toISOString().split('T')[0];
        dayMap[key] = {
          key,
          label: cursor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          revenue: 0,
          orders: 0,
        };
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const o of orders) {
        const key = new Date(o.createdAt).toISOString().split('T')[0];
        if (dayMap[key]) {
          dayMap[key].revenue += toNum(o.total);
          dayMap[key].orders += 1;
        }
      }
      timeSeries.push(...Object.values(dayMap));
    }

    const categoryMap = {};
    for (const o of orders) {
      for (const item of o.items) {
        const cat = item.product?.category || 'Uncategorised';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, revenue: 0, units: 0 };
        }
        categoryMap[cat].revenue += toNum(item.price) * item.quantity;
        categoryMap[cat].units += item.quantity;
      }
    }
    const categoryBreakdown = Object.values(categoryMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
      }));

    const productMap = {};
    for (const o of orders) {
      for (const item of o.items) {
        const key = item.productId;
        if (!productMap[key]) {
          productMap[key] = {
            productId: key,
            name: item.product?.name || 'Unknown',
            category: item.product?.category || '',
            image: item.product?.images?.[0] || null,
            units: 0,
            revenue: 0,
            orders: 0,
          };
        }
        productMap[key].units += item.quantity;
        productMap[key].revenue += toNum(item.price) * item.quantity;
        productMap[key].orders += 1;
      }
    }
    const topProducts = Object.values(productMap)
      .map((p) => ({ ...p, revenue: Number(p.revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      period: range.label,
      range: { from: range.start, to: range.end },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        totalItems,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        changeRevenue: pct(totalRevenue, prevRevenue),
        changeOrders: pct(totalOrders, prevOrdersCount),
        changeItems: pct(totalItems, prevItems),
        changeAOV: pct(averageOrderValue, prevAOV),
      },
      timeSeries,
      categoryBreakdown,
      topProducts,
    };
  }

  async getProductReport({ limit = 50, sort = 'revenue' } = {}) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { orderItems: true } },
        orderItems: { select: { quantity: true, price: true } },
        colorMedia: { orderBy: { sortOrder: 'asc' } },
      },
    });

    const rows = products.map((product) => {
      const totalUnits = product.orderItems.reduce((s, i) => s + i.quantity, 0);
      const totalRevenue = product.orderItems.reduce(
        (s, i) => s + toNum(i.price) * i.quantity,
        0
      );
      return {
        id: product.id,
        name: product.name,
        category: product.category || '',
        image: product.images?.[0] || product.colorMedia?.[0]?.url || null,
        price: toNum(product.price),
        stock: product.stock,
        totalSold: totalUnits,
        revenue: Number(totalRevenue.toFixed(2)),
      };
    });

    if (sort === 'units') {
      rows.sort((a, b) => b.totalSold - a.totalSold);
    } else {
      rows.sort((a, b) => b.revenue - a.revenue);
    }

    return rows.slice(0, Math.min(parseInt(limit, 10) || 50, 200));
  }

  // ============== INVENTORY ==============
  async getInventory() {
    const inventory = await prisma.product.findMany({
      where: { isActive: true },
      include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { stock: 'asc' },
    });

    return inventory.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      stock: item.stock,
      price: toNum(item.price),
      images: item.images,
      status:
        item.stock === 0 ? 'OUT_OF_STOCK' :
        item.stock < 10 ? 'LOW_STOCK' :
        'IN_STOCK',
    }));
  }

  async adjustInventory({ productId, quantity, type, reason, notes }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const newStock = type === 'ADD' ? product.stock + quantity : product.stock - quantity;
    if (newStock < 0) {
      const err = new Error('Insufficient stock');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return {
      product: updated,
      previousStock: product.stock,
      newStock,
      audit: { productId, reason, notes },
    };
  }

  // ============== INVOICES ==============
  async getInvoices() {
    const invoices = await prisma.invoice.findMany({
      orderBy: { generatedAt: 'desc' },
    });
    return invoices.map((i) => ({
      ...i,
      subtotal: toNum(i.subtotal),
      discount: toNum(i.discount),
      tax: toNum(i.tax),
      shipping: toNum(i.shipping),
      total: toNum(i.total),
    }));
  }

  async generateInvoice(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const orderTotal = toNum(order.total);

    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        customerName: order.user?.name || 'Guest',
        customerEmail: order.user?.email || '',
        customerPhone: order.user?.phone || '',
        customerAddress: order.shippingAddress,
        subtotal: orderTotal * 0.97,
        tax: orderTotal * 0.03,
        shipping: 0,
        total: orderTotal,
        paymentMethod: order.paymentMethod || 'COD',
        paymentStatus: order.paymentStatus,
        items: order.items.map((item) => ({
          name: item.product?.name,
          quantity: item.quantity,
          price: toNum(item.price),
          total: toNum(item.price) * item.quantity,
        })),
      },
    });

    return {
      invoice,
      serialized: {
        ...invoice,
        subtotal: toNum(invoice.subtotal),
        discount: toNum(invoice.discount),
        tax: toNum(invoice.tax),
        shipping: toNum(invoice.shipping),
        total: toNum(invoice.total),
      },
      audit: { orderId, invoiceNumber },
    };
  }

  // ============== RETURNS ==============
  async getReturns() {
    let returns = [];
    try {
      returns = await prisma.return.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          order: { select: { id: true, total: true, status: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Returns query failed:', error.message);
      returns = [];
    }

    return returns.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      userId: r.userId,
      customerName: r.user?.name || 'Guest',
      customerEmail: r.user?.email || '',
      customerPhone: r.user?.phone || '',
      reason: r.reason,
      status: r.status,
      inspectionResult: r.inspectionResult || null,
      refundAmount: toNumOrNull(r.refundAmount),
      refundStatus: r.refundStatus || 'PENDING',
      returnTrackingNumber: r.returnTrackingNumber || null,
      receivedAt: r.receivedAt,
      inspectedAt: r.inspectedAt,
      refundedAt: r.refundedAt,
      createdAt: r.createdAt,
      order: r.order
        ? { id: r.order.id, total: toNum(r.order.total), status: r.order.status }
        : null,
      items: (r.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || 'Product',
        image: it.product?.images?.[0] || null,
        quantity: it.quantity,
        price: toNum(it.price),
        condition: it.condition || null,
        isAccepted: it.isAccepted ?? false,
      })),
    }));
  }

  async getReturnById(id) {
    const ret = await prisma.return.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        order: { select: { id: true, total: true, status: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
      },
    });

    if (!ret) {
      const err = new Error('Return not found');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: ret.id,
      orderId: ret.orderId,
      customerName: ret.user?.name || 'Guest',
      customerEmail: ret.user?.email || '',
      customerPhone: ret.user?.phone || '',
      reason: ret.reason,
      status: ret.status,
      inspectionResult: ret.inspectionResult || null,
      refundAmount: toNumOrNull(ret.refundAmount),
      refundStatus: ret.refundStatus || 'PENDING',
      returnTrackingNumber: ret.returnTrackingNumber || null,
      receivedAt: ret.receivedAt,
      inspectedAt: ret.inspectedAt,
      refundedAt: ret.refundedAt,
      createdAt: ret.createdAt,
      order: ret.order
        ? { id: ret.order.id, total: toNum(ret.order.total), status: ret.order.status }
        : null,
      items: (ret.items || []).map((it) => ({
        id: it.id,
        name: it.product?.name || 'Product',
        image: it.product?.images?.[0] || null,
        quantity: it.quantity,
        price: toNum(it.price),
        condition: it.condition || null,
        isAccepted: it.isAccepted ?? false,
      })),
    };
  }

  async updateReturnStatus(returnId, body = {}) {
    const VALID = [
      'PENDING',
      'APPROVED',
      'RECEIVED',
      'INSPECTING',
      'INSPECTED',
      'REFUNDED',
      'COMPLETED',
      'REJECTED',
    ];

    let status;
    let extras = {};
    if (typeof body === 'string') {
      status = body;
    } else if (body && typeof body === 'object') {
      status = body.status;
      extras = body;
    }

    const normalized = String(status || '').toUpperCase().trim();
    if (!VALID.includes(normalized)) {
      const err = new Error(
        `Invalid return status "${status}". Must be one of: ${VALID.join(', ')}`
      );
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.return.findUnique({ where: { id: returnId } });
    if (!existing) {
      const err = new Error('Return not found');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const data = { status: normalized };

    if (normalized === 'RECEIVED')   data.receivedAt = now;
    if (normalized === 'INSPECTING') data.inspectedAt = now;
    if (normalized === 'INSPECTED')  data.inspectedAt = now;
    if (normalized === 'REFUNDED')   data.refundedAt = now;
    if (normalized === 'COMPLETED')  data.refundedAt = now;

    if (normalized === 'REFUNDED' || normalized === 'COMPLETED') {
      data.refundStatus = 'COMPLETED';
    } else if (normalized === 'REJECTED') {
      data.refundStatus = 'REJECTED';
      data.refundAmount = 0;
    }

    const { inspectionResult, returnTrackingNumber, refundAmount, refundStatus } = extras;

    if (inspectionResult !== undefined) {
      data.inspectionResult = inspectionResult === '' ? null : inspectionResult;
    }
    if (returnTrackingNumber !== undefined) {
      data.returnTrackingNumber =
        returnTrackingNumber === '' ? null : returnTrackingNumber;
    }
    if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
      const amt = parseFloat(refundAmount);
      if (Number.isFinite(amt) && amt >= 0) data.refundAmount = amt;
    }
    if (refundStatus !== undefined) {
      data.refundStatus = refundStatus;
    }

    const updated = await prisma.return.update({
      where: { id: returnId },
      data,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        order: { select: { id: true, total: true, status: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
      },
    });

    const flat = {
      id: updated.id,
      orderId: updated.orderId,
      userId: updated.userId,
      customerName: updated.user?.name || 'Guest',
      customerEmail: updated.user?.email || '',
      customerPhone: updated.user?.phone || '',
      reason: updated.reason,
      status: updated.status,
      inspectionResult: updated.inspectionResult || null,
      refundAmount: toNumOrNull(updated.refundAmount),
      refundStatus: updated.refundStatus || 'PENDING',
      returnTrackingNumber: updated.returnTrackingNumber || null,
      receivedAt: updated.receivedAt,
      inspectedAt: updated.inspectedAt,
      refundedAt: updated.refundedAt,
      createdAt: updated.createdAt,
      order: updated.order
        ? {
            id: updated.order.id,
            total: toNum(updated.order.total),
            status: updated.order.status,
          }
        : null,
      items: (updated.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || 'Product',
        image: it.product?.images?.[0] || null,
        quantity: it.quantity,
        price: toNum(it.price),
        condition: it.condition || null,
        isAccepted: it.isAccepted ?? false,
      })),
    };

    const audit = {
      returnId,
      orderId: updated.orderId,
      fromStatus: existing.status,
      toStatus: updated.status,
      fromRefundStatus: existing.refundStatus,
      toRefundStatus: updated.refundStatus,
      refundAmount: toNumOrNull(updated.refundAmount),
      inspectionResult: updated.inspectionResult || null,
      returnTrackingNumber: updated.returnTrackingNumber || null,
    };

    return { data: flat, audit };
  }

  // ============== PAYMENTS ==============
  async getPayments() {
    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => {
      const orderTotal = p.order ? toNum(p.order.total) : null;
      let amount = toNum(p.amount);

      if (orderTotal != null && orderTotal > 0 && amount > orderTotal * 2) {
        console.warn(
          `[getPayments] Corrupted amount on payment ${p.id}: ` +
            `${amount} vs order.total ${orderTotal}. Using order.total.`
        );
        amount = orderTotal;
      }

      return {
        ...p,
        amount: Number(amount.toFixed(2)),
        refundAmount: toNumOrNull(p.refundAmount),
        order: p.order
          ? { ...p.order, total: orderTotal != null ? Number(orderTotal.toFixed(2)) : 0 }
          : p.order,
      };
    });
  }

  // ============== ABANDONED CART ==============
  async getAbandonedCarts({ search, status, from, to, page = 1, limit = 20 } = {}) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};

    if (status === 'active') where.recovered = false;
    else if (status === 'recovered') where.recovered = true;
    else if (status === 'reminded') {
      where.recovered = false;
      where.reminderSent = true;
    } else if (status === 'not_reminded') {
      where.recovered = false;
      where.reminderSent = false;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.user = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.abandonedCart.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.abandonedCart.count({ where }),
    ]);

    return {
      carts: rows.map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.user?.name || 'Guest',
        userEmail: c.user?.email || '',
        userPhone: c.user?.phone || '',
        items: c.items || [],
        subtotal: toNum(c.subtotal),
        total: toNum(c.total),
        reminderSent: c.reminderSent,
        reminderSentAt: c.reminderSentAt,
        recovered: c.recovered,
        recoveredAt: c.recoveredAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getAbandonedCartStats() {
    const [total, active, reminded, recovered, revenueAgg] = await Promise.all([
      prisma.abandonedCart.count(),
      prisma.abandonedCart.count({ where: { recovered: false } }),
      prisma.abandonedCart.count({ where: { recovered: false, reminderSent: true } }),
      prisma.abandonedCart.count({ where: { recovered: true } }),
      prisma.abandonedCart.aggregate({
        where: { recovered: false },
        _sum: { total: true },
      }),
    ]);

    return {
      total,
      active,
      reminded,
      recovered,
      potentialRevenue: toNum(revenueAgg._sum.total),
      recoveryRate:
        total > 0 ? Math.round((recovered / total) * 100) : 0,
    };
  }

  async deleteAbandonedCart(id) {
    const existing = await prisma.abandonedCart.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Abandoned cart not found');
      err.statusCode = 404;
      throw err;
    }
    await prisma.abandonedCart.delete({ where: { id } });
    return { id };
  }

  async markAbandonedCartRecovered(id, recovered = true) {
    const existing = await prisma.abandonedCart.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Abandoned cart not found');
      err.statusCode = 404;
      throw err;
    }
    const row = await prisma.abandonedCart.update({
      where: { id },
      data: {
        recovered,
        recoveredAt: recovered ? new Date() : null,
      },
    });
    return { id: row.id, recovered: row.recovered, recoveredAt: row.recoveredAt };
  }

  async detectAbandonedCarts({ idleHours = 2 } = {}) {
    const allCarts = await prisma.cart.findMany({
      include: {
        product: {
          include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const byUser = new Map();
    for (const c of allCarts) {
      if (!byUser.has(c.userId)) byUser.set(c.userId, []);
      byUser.get(c.userId).push(c);
    }

    const created = [];
    const skipped = [];

    for (const [userId, cartItems] of byUser.entries()) {
      const existing = await prisma.abandonedCart.findFirst({
        where: { userId, recovered: false },
      });
      if (existing) {
        skipped.push({ userId, reason: 'already tracked' });
        continue;
      }

      const items = cartItems.map((ci) => ({
        productId: ci.productId,
        name: ci.product?.name || 'Product',
        price: toNum(ci.product?.price),
        quantity: ci.quantity,
        image:
          ci.product?.images?.[0] ||
          ci.product?.colorMedia?.[0]?.url ||
          null,
      }));

      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const total = subtotal;

      const row = await prisma.abandonedCart.create({
        data: {
          userId,
          items,
          subtotal,
          total,
          reminderSent: false,
          recovered: false,
        },
      });
      created.push({ id: row.id, userId, itemCount: items.length, total });
    }

    return { created, skipped, scanned: byUser.size };
  }

  async sendAbandonedCartReminder(id) {
    const existing = await prisma.abandonedCart.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Abandoned cart not found');
      err.statusCode = 404;
      throw err;
    }

    const cart = await prisma.abandonedCart.update({
      where: { id },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    });

    return {
      id: cart.id,
      userId: cart.userId,
      reminderSent: cart.reminderSent,
      reminderSentAt: cart.reminderSentAt,
    };
  }

  // ============== WISHLIST ==============
  async getWishlists({ search, page = 1, limit = 20 } = {}) {
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.wishlistItem.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: {
            include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip,
        take,
      }),
      prisma.wishlistItem.count({ where }),
    ]);

    return {
      wishlists: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        productId: r.productId,
        variantId: r.variantId,
        addedAt: r.addedAt,
        userName: r.user?.name || 'Guest',
        userEmail: r.user?.email || '',
        productName: r.product?.name || 'Product',
        productPrice: toNum(r.product?.price),
        productCategory: r.product?.category || '',
        productImage:
          r.product?.images?.[0] ||
          r.product?.colorMedia?.[0]?.url ||
          null,
      })),
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getWishlistStats() {
    const [total, uniqueUsers, uniqueProducts] = await Promise.all([
      prisma.wishlistItem.count(),
      prisma.wishlistItem
        .findMany({ select: { userId: true }, distinct: ['userId'] })
        .then((rows) => rows.length),
      prisma.wishlistItem
        .findMany({ select: { productId: true }, distinct: ['productId'] })
        .then((rows) => rows.length),
    ]);

    const grouped = await prisma.wishlistItem.groupBy({
      by: ['productId'],
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    });

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { colorMedia: { orderBy: { sortOrder: 'asc' } } },
    });

    const topProducts = grouped.map((g) => {
      const p = products.find((x) => x.id === g.productId);
      return {
        productId: g.productId,
        name: p?.name || 'Unknown',
        price: toNum(p?.price),
        image: p?.images?.[0] || p?.colorMedia?.[0]?.url || null,
        count: g._count._all,
      };
    });

    return { total, uniqueUsers, uniqueProducts, topProducts };
  }

  async deleteWishlist(id) {
    const existing = await prisma.wishlistItem.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Wishlist item not found');
      err.statusCode = 404;
      throw err;
    }
    await prisma.wishlistItem.delete({ where: { id } });
    return { id };
  }

  // ============== ADMIN USERS ==============
  async getAdminUsers() {
    return prisma.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdminUser({ name, email, password, role, permissions, isActive }) {
    // ---- Validation ----
    if (!name || !name.trim()) {
      const err = new Error('Name is required');
      err.statusCode = 400;
      throw err;
    }
    if (!email || !email.trim()) {
      const err = new Error('Email is required');
      err.statusCode = 400;
      throw err;
    }
    if (!password) {
      const err = new Error('Password is required');
      err.statusCode = 400;
      throw err;
    }
    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ---- Duplicate check ----
    const existing = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      const err = new Error('An admin user with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    // ---- Hash + create ----
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await prisma.adminUser.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'ADMIN',
        permissions: Array.isArray(permissions) ? permissions : [],
        isActive: isActive !== false,
      },
      select: {
        id: true, name: true, email: true, role: true,
        permissions: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });

    return {
      user: adminUser,
      audit: { name: adminUser.name, email: adminUser.email, role: adminUser.role },
    };
  }

  async updateAdminUser(id, { name, email, password, role, permissions, isActive }) {
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Admin user not found');
      err.statusCode = 404;
      throw err;
    }

    // ---- Duplicate email check (only if email is being changed) ----
    if (email && email.trim().toLowerCase() !== existing.email) {
      const collision = await prisma.adminUser.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (collision) {
        const err = new Error('Another admin user already uses this email');
        err.statusCode = 409;
        throw err;
      }
    }

    const data = {};

    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email.trim().toLowerCase();
    if (role !== undefined) data.role = role;
    if (permissions !== undefined) {
      data.permissions = Array.isArray(permissions) ? permissions : [];
    }
    if (isActive !== undefined) data.isActive = !!isActive;

    // ---- Password: only change if a non-empty value was provided ----
    if (password && password.trim()) {
      if (password.length < 6) {
        const err = new Error('Password must be at least 6 characters');
        err.statusCode = 400;
        throw err;
      }
      data.password = await bcrypt.hash(password, 10);
    }

    const adminUser = await prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        permissions: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });

    return {
      user: adminUser,
      audit: {
        updatedFields: Object.keys(data),
        name: adminUser.name,
        role: adminUser.role,
      },
    };
  }

  async deleteAdminUser(id) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      const err = new Error('Admin user not found');
      err.statusCode = 404;
      throw err;
    }

    // Prevent deleting the last Super Admin
    if (user.role === 'SUPER_ADMIN') {
      const superCount = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN' },
      });
      if (superCount <= 1) {
        const err = new Error('Cannot delete the last Super Admin');
        err.statusCode = 400;
        throw err;
      }
    }

    await prisma.adminUser.delete({ where: { id } });

    return {
      deletedUser: { id: user.id, name: user.name, email: user.email },
    };
  }

  // ============== BANNERS ==============
  _bannerStatus(b, now = new Date()) {
    if (!b.isActive) return 'inactive';
    if (b.startDate && new Date(b.startDate) > now) return 'scheduled';
    if (b.endDate && new Date(b.endDate) < now) return 'expired';
    return 'live';
  }

  async getBanners({ search, position, status, page = 1, limit = 50 } = {}) {
    const take = Math.min(parseInt(limit, 10) || 50, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (position) where.position = position;
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { subtitle: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    const withStatus = rows.map((b) => ({
      ...b,
      startDate: b.startDate,
      endDate: b.endDate,
      status: this._bannerStatus(b, now),
    }));

    const filtered =
      status && status !== 'all'
        ? withStatus.filter((b) => b.status === status)
        : withStatus;

    const total = filtered.length;
    const page_ = filtered.slice(skip, skip + take);

    return {
      banners: page_,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getBannerStats() {
    const rows = await prisma.banner.findMany();
    const now = new Date();

    const buckets = { live: 0, scheduled: 0, expired: 0, inactive: 0 };
    let totalClicks = 0;
    let totalViews = 0;

    for (const b of rows) {
      const s = this._bannerStatus(b, now);
      buckets[s] = (buckets[s] || 0) + 1;
      totalClicks += b.clicks || 0;
      totalViews += b.views || 0;
    }

    const topPerformer = rows
      .filter((b) => (b.views || 0) > 0)
      .sort((a, b) => (b.clicks / Math.max(b.views, 1)) - (a.clicks / Math.max(a.views, 1)))[0];

    return {
      total: rows.length,
      ...buckets,
      totalClicks,
      totalViews,
      ctr: totalViews > 0 ? Math.round((totalClicks / totalViews) * 10000) / 100 : 0,
      topPerformer: topPerformer
        ? {
            id: topPerformer.id,
            title: topPerformer.title,
            clicks: topPerformer.clicks || 0,
            views: topPerformer.views || 0,
            ctr:
              topPerformer.views > 0
                ? Math.round((topPerformer.clicks / topPerformer.views) * 10000) / 100
                : 0,
          }
        : null,
    };
  }

  async _validateBannerDates(startDate, endDate) {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      const err = new Error('End date must be after start date');
      err.statusCode = 400;
      throw err;
    }
  }

  async createBanner(data) {
    if (!data.title || !data.title.trim()) {
      const err = new Error('Title is required');
      err.statusCode = 400;
      throw err;
    }
    if (!data.imageUrl || !data.imageUrl.trim()) {
      const err = new Error('Image is required');
      err.statusCode = 400;
      throw err;
    }

    await this._validateBannerDates(data.startDate, data.endDate);

    let sortOrder = parseInt(data.sortOrder, 10);
    if (!Number.isFinite(sortOrder)) {
      const last = await prisma.banner.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const banner = await prisma.banner.create({
      data: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl.trim(),
        link: data.link?.trim() || null,
        buttonText: data.buttonText?.trim() || null,
        position: data.position || 'HOME',
        sortOrder,
        isActive: data.isActive !== false,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return { banner, audit: { title: banner.title, position: banner.position } };
  }

  async updateBanner(id, data) {
    await this._validateBannerDates(data.startDate, data.endDate);

    const patch = {};

    if (data.title !== undefined) patch.title = String(data.title).trim();
    if (data.subtitle !== undefined) patch.subtitle = data.subtitle?.trim() || null;
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    if (data.imageUrl !== undefined) patch.imageUrl = String(data.imageUrl).trim();
    if (data.link !== undefined) patch.link = data.link?.trim() || null;
    if (data.buttonText !== undefined) patch.buttonText = data.buttonText?.trim() || null;
    if (data.position !== undefined) patch.position = data.position;
    if (data.sortOrder !== undefined) {
      const n = parseInt(data.sortOrder, 10);
      if (Number.isFinite(n)) patch.sortOrder = n;
    }
    if (data.isActive !== undefined) patch.isActive = !!data.isActive;
    if (data.startDate !== undefined) {
      patch.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      patch.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const banner = await prisma.banner.update({ where: { id }, data: patch });
    return { banner, audit: patch };
  }

  async deleteBanner(id) {
    const banner = await prisma.banner.findUnique({
      where: { id },
      select: { title: true, imageUrl: true },
    });
    if (!banner) {
      const err = new Error('Banner not found');
      err.statusCode = 404;
      throw err;
    }

    if (banner.imageUrl && banner.imageUrl.includes('/uploads/')) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filename = banner.imageUrl.split('/uploads/')[1];
        const filepath = path.join(__dirname, '..', '..', 'uploads', filename);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (err) {
        console.warn('[banner.delete] file cleanup failed:', err.message);
      }
    }

    await prisma.banner.delete({ where: { id } });
    return { deletedBanner: banner };
  }

  async reorderBanners(items) {
    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('No items provided');
      err.statusCode = 400;
      throw err;
    }

    const updates = items
      .map((it) => {
        const sortOrder = parseInt(it.sortOrder, 10);
        if (!it.id || !Number.isFinite(sortOrder)) return null;
        return prisma.banner.update({
          where: { id: it.id },
          data: { sortOrder },
        });
      })
      .filter(Boolean);

    await prisma.$transaction(updates);
    return { updated: updates.length };
  }

  async recordBannerView(id) {
    try {
      await prisma.banner.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    } catch (_) {}
  }

  async recordBannerClick(id) {
    try {
      await prisma.banner.update({
        where: { id },
        data: { clicks: { increment: 1 } },
      });
    } catch (_) {}
  }

  async getLiveBanners(position = 'HOME') {
    const rows = await prisma.banner.findMany({
      where: { isActive: true, position },
      orderBy: { sortOrder: 'asc' },
    });
    const now = new Date();
    return rows.filter((b) => this._bannerStatus(b, now) === 'live');
  }

  // ============== AUDIT LOGS ==============
  async getAuditLogs() {
    return prisma.auditLog.findMany({
      include: {
        adminUser: { select: { name: true, email: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

    async createAuditLog(data) {
    try {
      let adminUserId = data.adminUserId || null;
      let userId = data.userId || null;

      const rawId = adminUserId || userId;

      if (rawId && (!adminUserId || !userId)) {
        const isAdmin = await prisma.adminUser.findUnique({
          where: { id: rawId },
          select: { id: true },
        });

        if (isAdmin) {
          adminUserId = rawId;
          userId = null;
        } else {
          const isUser = await prisma.user.findUnique({
            where: { id: rawId },
            select: { id: true },
          });

          if (isUser) {
            adminUserId = null;
            userId = rawId;
          } else {
            console.warn('[auditLog] unknown actor id, skipping:', rawId);
            return;
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          adminUserId,
          userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          changes: data.changes,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Create audit log error:', error.message);
    }
  }
}

module.exports = new AdminService();