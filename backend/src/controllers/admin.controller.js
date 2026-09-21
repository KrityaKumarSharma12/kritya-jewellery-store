const adminService = require('../services/admin.service');
const prisma = require('../lib/prisma');

class AdminController {
  // ============== DASHBOARD ==============
  async getDashboardStats(req, res) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============== PRODUCTS ==============
  async getAllProducts(req, res) {
    try {
      const result = await adminService.getAllProducts(req.query);
      res.json(result);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createProduct(req, res) {
    try {
      const product = await adminService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateProduct(req, res) {
    try {
      const product = await adminService.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteProduct(req, res) {
    try {
      await adminService.deleteProduct(req.params.id);
      res.json({ message: 'Product deactivated successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== CATEGORIES ==============
  async getCategories(req, res) {
    try {
      const categories = await adminService.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createCategory(req, res) {
    try {
      const category = await adminService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create category error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'A category with this slug already exists' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await adminService.updateCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error('Update category error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'A category with this slug already exists' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteCategory(req, res) {
    try {
      await adminService.deleteCategory(req.params.id);
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Delete category error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== SUBCATEGORIES ==============
  async getSubcategories(req, res) {
    try {
      const subs = await adminService.getSubcategories();
      res.json(subs);
    } catch (error) {
      console.error('Get subcategories error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createSubcategory(req, res) {
    try {
      const sub = await adminService.createSubcategory(req.body);
      res.status(201).json(sub);
    } catch (error) {
      console.error('Create subcategory error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'A subcategory with this slug already exists' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateSubcategory(req, res) {
    try {
      const sub = await adminService.updateSubcategory(req.params.id, req.body);
      res.json(sub);
    } catch (error) {
      console.error('Update subcategory error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteSubcategory(req, res) {
    try {
      await adminService.deleteSubcategory(req.params.id);
      res.json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
      console.error('Delete subcategory error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== DIAMONDS ==============
  async getDiamonds(req, res) {
    try {
      res.json(await adminService.getDiamonds());
    } catch (error) {
      console.error('Get diamonds error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createDiamond(req, res) {
    try {
      res.status(201).json(await adminService.createDiamond(req.body));
    } catch (error) {
      console.error('Create diamond error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateDiamond(req, res) {
    try {
      res.json(await adminService.updateDiamond(req.params.id, req.body));
    } catch (error) {
      console.error('Update diamond error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteDiamond(req, res) {
    try {
      await adminService.deleteDiamond(req.params.id);
      res.json({ message: 'Diamond deactivated successfully' });
    } catch (error) {
      console.error('Delete diamond error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== ORDERS ==============
  async getAllOrders(req, res) {
    try {
      res.json(await adminService.getAllOrders(req.query));
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getRecentOrders(req, res) {
    try {
      res.json(await adminService.getRecentOrders());
    } catch (error) {
      console.error('Get recent orders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      res.json(await adminService.updateOrderStatus(req.params.id, status));
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updatePaymentStatus(req, res) {
    try {
      const { paymentStatus } = req.body;
      res.json(await adminService.updatePaymentStatus(req.params.id, paymentStatus));
    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== CUSTOMERS ==============
  async getAllCustomers(req, res) {
    try {
      res.json(await adminService.getAllCustomers(req.query));
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getCustomerById(req, res) {
    try {
      res.json(await adminService.getCustomerById(req.params.id));
    } catch (error) {
      console.error('Get customer error:', error);
      if (error.statusCode === 404) return res.status(404).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async blockCustomer(req, res) {
    try {
      const { isBlocked } = req.body;
      res.json(await adminService.blockCustomer(req.params.id, isBlocked));
    } catch (error) {
      console.error('Block customer error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== METAL RATES ==============
  async getMetalRates(req, res) {
    try {
      res.json(await adminService.getMetalRates());
    } catch (error) {
      console.error('Get metal rates error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateMetalRate(req, res) {
    try {
      const rate = await adminService.updateMetalRate(req.params.id, req.body.ratePerGram);
      res.json(rate);
    } catch (error) {
      console.error('Update metal rate error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async bulkUpdateMetalRates(req, res) {
    try {
      const results = await adminService.bulkUpdateMetalRates(req.body.rates);
      res.json({ message: 'Bulk update complete', results });
    } catch (error) {
      console.error('Bulk update metal rates error:', error);
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getMetalRateHistory(req, res) {
    try {
      res.json(await adminService.getMetalRateHistory());
    } catch (error) {
      console.error('Get metal rate history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ⭐ NEW: getMetalOptions — dropdown options for the product form
  async getMetalOptions(req, res) {
    try {
      const productService = require('../services/product.service');
      res.json(await productService.getMetalOptions());
    } catch (error) {
      console.error('Get metal options error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

    async getGemstoneOptions(req, res) {
    try {
      const productService = require('../services/product.service');
      res.json(await productService.getGemstoneOptions());
    } catch (error) {
      console.error('Get gemstone options error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== COUPONS ==============
  async getCoupons(req, res) {
    try {
      res.json(await adminService.getCoupons());
    } catch (error) {
      console.error('Get coupons error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createCoupon(req, res) {
    try {
      res.status(201).json(await adminService.createCoupon(req.body));
    } catch (error) {
      console.error('Create coupon error:', error);
      if (error.statusCode === 400) return res.status(400).json({ message: error.message });
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'A coupon with this code already exists' });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateCoupon(req, res) {
    try {
      res.json(await adminService.updateCoupon(req.params.id, req.body));
    } catch (error) {
      console.error('Update coupon error:', error);
      if (error.statusCode === 400) return res.status(400).json({ message: error.message });
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  async deleteCoupon(req, res) {
    try {
      await adminService.deleteCoupon(req.params.id);
      res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== REPORTS ==============
  async getSalesReport(req, res) {
    try {
      const { period = 'monthly', from, to } = req.query;
      const result = await adminService.getSalesReport({ period, from, to });
      res.json(result);
    } catch (error) {
      console.error('Sales report error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getProductReport(req, res) {
    try {
      const { limit = 50, sort = 'revenue' } = req.query;
      res.json(await adminService.getProductReport({ limit, sort }));
    } catch (error) {
      console.error('Product report error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async exportReportCsv(req, res) {
    try {
      const { period = 'monthly', from, to } = req.query;
      const report = await adminService.getSalesReport({ period, from, to });

      const lines = [];

      lines.push('Reports & Analytics');
      lines.push(`Period,${report.period}`);
      lines.push(`From,${report.range.from}`);
      lines.push(`To,${report.range.to}`);
      lines.push('');

      lines.push('Summary');
      lines.push('Metric,Value,Change %');
      lines.push(`Total Revenue,${report.summary.totalRevenue},${report.summary.changeRevenue}`);
      lines.push(`Total Orders,${report.summary.totalOrders},${report.summary.changeOrders}`);
      lines.push(`Total Items Sold,${report.summary.totalItems},${report.summary.changeItems}`);
      lines.push(`Average Order Value,${report.summary.averageOrderValue},${report.summary.changeAOV}`);
      lines.push('');

      lines.push('Time Series');
      lines.push('Date,Revenue,Orders');
      for (const row of report.timeSeries) {
        lines.push(`${row.label},${row.revenue.toFixed(2)},${row.orders}`);
      }
      lines.push('');

      lines.push('Category Breakdown');
      lines.push('Category,Revenue,Units');
      for (const cat of report.categoryBreakdown) {
        lines.push(`${cat.category},${cat.revenue.toFixed(2)},${cat.units}`);
      }
      lines.push('');

      lines.push('Top Products');
      lines.push('Product,Category,Units,Revenue,Orders');
      for (const p of report.topProducts) {
        lines.push(`"${p.name}",${p.category},${p.units},${p.revenue.toFixed(2)},${p.orders}`);
      }

      const csv = lines.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${report.period}-${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error('Export report CSV error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== INVENTORY ==============
  async getInventory(req, res) {
    try {
      res.json(await adminService.getInventory());
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async adjustInventory(req, res) {
    try {
      const result = await adminService.adjustInventory(req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'UPDATE',
        entity: 'Inventory',
        entityId: req.body.productId,
        changes: result.audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        message: 'Inventory adjusted successfully',
        product: result.product,
        previousStock: result.previousStock,
        newStock: result.newStock,
      });
    } catch (error) {
      console.error('Adjust inventory error:', error);
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== INVOICES ==============
  async getInvoices(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      const result = await invoiceService.list(req.query);
      res.json(result);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getInvoiceById(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      res.json(await invoiceService.getById(req.params.id));
    } catch (error) {
      console.error('Get invoice error:', error);
      if (error.statusCode)
        return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async generateInvoice(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      const inv = await invoiceService.generateForOrder(req.params.orderId);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: inv.id,
        changes: { invoiceNumber: inv.invoiceNumber, orderId: inv.orderId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(inv);
    } catch (error) {
      console.error('Generate invoice error:', error);
      if (error.statusCode)
        return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async downloadInvoicePdf(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      const { streamInvoicePdf } = require('../lib/pdf/invoice.template');
      const prisma = require('../lib/prisma');

      const inv = await invoiceService.getById(req.params.id);

      let store = {
        name: "Kritya's Jewellery",
        address: 'Lucknow, India',
        email: 'support@krityas.com',
        phone: '',
        gstNumber: null,
      };
      try {
        const settings = await prisma.storeSettings.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (settings) {
          store = {
            ...store,
            name: settings.storeName || store.name,
            address: settings.address || store.address,
            email: settings.email || store.email,
            phone: settings.phone || store.phone,
            gstNumber: settings.gstNumber || null,
          };
        }
      } catch (_) {}

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${inv.invoiceNumber}.pdf"`);
      streamInvoicePdf(inv, null, res, store);
    } catch (error) {
      console.error('Invoice PDF error:', error);
      if (error.statusCode)
        return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async exportInvoicesCsv(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      const { invoices } = await invoiceService.list({
        ...req.query,
        page: 1,
        limit: 100,
      });

      const header = [
        'Invoice #', 'Order #', 'Date', 'Customer', 'Email', 'Phone',
        'Subtotal', 'Discount', 'Tax', 'Shipping', 'Total',
        'Payment Method', 'Payment Status',
      ];

      const rows = invoices.map((i) => [
        i.invoiceNumber,
        i.orderId,
        new Date(i.generatedAt).toISOString(),
        i.customerName || '',
        i.customerEmail || '',
        i.customerPhone || '',
        i.subtotal,
        i.discount,
        i.tax,
        i.shipping,
        i.total,
        i.paymentMethod || '',
        i.paymentStatus || '',
      ]);

      const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoices-${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error('Export invoices CSV error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async backfillInvoices(req, res) {
    try {
      const invoiceService = require('../services/invoice.service');
      const results = await invoiceService.backfill();
      res.json({
        message: `Backfill complete: ${results.filter((r) => r.ok).length} created`,
        results,
      });
    } catch (error) {
      console.error('Backfill invoices error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== RETURNS ==============
  async getReturns(req, res) {
    try {
      res.json(await adminService.getReturns());
    } catch (error) {
      console.error('Get returns error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateReturnStatus(req, res) {
    try {
      const { data, audit } = await adminService.updateReturnStatus(req.params.id, req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'UPDATE',
        entity: 'Return',
        entityId: req.params.id,
        changes: audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(data);
    } catch (error) {
      console.error('Update return status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getReturnById(req, res) {
    try {
      res.json(await adminService.getReturnById(req.params.id));
    } catch (error) {
      console.error('Get return error:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== PAYMENTS ==============
  async getPayments(req, res) {
    try {
      res.json(await adminService.getPayments());
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== ABANDONED CARTS ==============
  async getAbandonedCarts(req, res) {
    try {
      res.json(await adminService.getAbandonedCarts(req.query));
    } catch (error) {
      console.error('Get abandoned carts error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getAbandonedCartStats(req, res) {
    try {
      res.json(await adminService.getAbandonedCartStats());
    } catch (error) {
      console.error('Abandoned cart stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async sendAbandonedCartReminder(req, res) {
    try {
      const cart = await adminService.sendAbandonedCartReminder(req.params.id);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'UPDATE',
        entity: 'AbandonedCart',
        entityId: req.params.id,
        changes: { reminderSent: true },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Reminder sent successfully', cart });
    } catch (error) {
      console.error('Send abandoned cart reminder error:', error);
      if (error.statusCode === 404)
        return res.status(404).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteAbandonedCart(req, res) {
    try {
      await adminService.deleteAbandonedCart(req.params.id);
      res.json({ message: 'Abandoned cart removed' });
    } catch (error) {
      console.error('Delete abandoned cart error:', error);
      if (error.statusCode === 404)
        return res.status(404).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async markAbandonedCartRecovered(req, res) {
    try {
      const { recovered = true } = req.body || {};
      const result = await adminService.markAbandonedCartRecovered(
        req.params.id,
        recovered
      );
      res.json(result);
    } catch (error) {
      console.error('Mark recovered error:', error);
      if (error.statusCode === 404)
        return res.status(404).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async detectAbandonedCarts(req, res) {
    try {
      const { idleHours } = req.body || {};
      const result = await adminService.detectAbandonedCarts({
        idleHours: idleHours ? parseInt(idleHours, 10) : 2,
      });
      res.json({
        message: `Scanned ${result.scanned} users · Created ${result.created.length} carts`,
        ...result,
      });
    } catch (error) {
      console.error('Detect abandoned carts error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async exportAbandonedCartsCsv(req, res) {
    try {
      const { carts } = await adminService.getAbandonedCarts({
        ...req.query,
        page: 1,
        limit: 100,
      });

      const header = [
        'Customer', 'Email', 'Phone', 'Items', 'Subtotal', 'Total',
        'Reminder Sent', 'Reminder Date', 'Recovered', 'Recovered Date',
        'Created', 'Last Activity',
      ];

      const rows = carts.map((c) => [
        c.userName,
        c.userEmail,
        c.userPhone,
        Array.isArray(c.items) ? c.items.length : 0,
        c.subtotal,
        c.total,
        c.reminderSent ? 'yes' : 'no',
        c.reminderSentAt ? new Date(c.reminderSentAt).toISOString() : '',
        c.recovered ? 'yes' : 'no',
        c.recoveredAt ? new Date(c.recoveredAt).toISOString() : '',
        new Date(c.createdAt).toISOString(),
        new Date(c.updatedAt).toISOString(),
      ]);

      const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="abandoned-carts-${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error('Export abandoned carts CSV error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== WISHLIST ==============
  async getWishlists(req, res) {
    try {
      res.json(await adminService.getWishlists(req.query));
    } catch (error) {
      console.error('Get wishlists error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getWishlistStats(req, res) {
    try {
      res.json(await adminService.getWishlistStats());
    } catch (error) {
      console.error('Wishlist stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteWishlist(req, res) {
    try {
      await adminService.deleteWishlist(req.params.id);
      res.json({ message: 'Wishlist item removed' });
    } catch (error) {
      console.error('Delete wishlist error:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  async exportWishlistsCsv(req, res) {
    try {
      const { wishlists } = await adminService.getWishlists({
        ...req.query,
        page: 1,
        limit: 100,
      });

      const header = ['Product', 'Category', 'Price', 'Customer', 'Email', 'Added'];
      const rows = wishlists.map((w) => [
        w.productName,
        w.productCategory,
        w.productPrice,
        w.userName,
        w.userEmail,
        new Date(w.addedAt).toISOString(),
      ]);

      const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="wishlists-${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error('Export wishlists CSV error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== ADMIN USERS ==============
  async getAdminUsers(req, res) {
    try {
      res.json(await adminService.getAdminUsers());
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createAdminUser(req, res) {
    try {
      const { user, audit } = await adminService.createAdminUser(req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'CREATE',
        entity: 'AdminUser',
        entityId: user.id,
        changes: audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateAdminUser(req, res) {
    try {
      const { user, audit } = await adminService.updateAdminUser(req.params.id, req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'UPDATE',
        entity: 'AdminUser',
        entityId: req.params.id,
        changes: audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(user);
    } catch (error) {
      console.error('Update admin user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteAdminUser(req, res) {
    try {
      const { deletedUser } = await adminService.deleteAdminUser(req.params.id);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'DELETE',
        entity: 'AdminUser',
        entityId: req.params.id,
        changes: { deletedUser },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Admin user deleted successfully' });
    } catch (error) {
      console.error('Delete admin user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== BANNERS ==============
  async getBanners(req, res) {
    try {
      res.json(await adminService.getBanners(req.query));
    } catch (error) {
      console.error('Get banners error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async getBannerStats(req, res) {
    try {
      res.json(await adminService.getBannerStats());
    } catch (error) {
      console.error('Get banner stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createBanner(req, res) {
    try {
      const { banner, audit } = await adminService.createBanner(req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'CREATE',
        entity: 'Banner',
        entityId: banner.id,
        changes: audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json(banner);
    } catch (error) {
      console.error('Create banner error:', error);
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateBanner(req, res) {
    try {
      const { banner, audit } = await adminService.updateBanner(req.params.id, req.body);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'UPDATE',
        entity: 'Banner',
        entityId: req.params.id,
        changes: audit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json(banner);
    } catch (error) {
      console.error('Update banner error:', error);
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async deleteBanner(req, res) {
    try {
      const { deletedBanner } = await adminService.deleteBanner(req.params.id);

      await adminService.createAuditLog({
        adminUserId: req.user.id,
        action: 'DELETE',
        entity: 'Banner',
        entityId: req.params.id,
        changes: { deletedBanner },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Banner deleted successfully' });
    } catch (error) {
      console.error('Delete banner error:', error);
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async reorderBanners(req, res) {
    try {
      const { items } = req.body || {};
      const result = await adminService.reorderBanners(items);
      res.json({ message: 'Reordered', ...result });
    } catch (error) {
      console.error('Reorder banners error:', error);
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      res.status(500).json({ message: 'Server error' });
    }
  }

  async exportBannersCsv(req, res) {
    try {
      const { banners } = await adminService.getBanners({
        ...req.query,
        page: 1,
        limit: 500,
      });

      const header = [
        'Title', 'Subtitle', 'Position', 'Sort Order', 'Status',
        'Active', 'Start Date', 'End Date', 'Views', 'Clicks',
        'CTR %', 'Link', 'Image URL',
      ];
      const rows = banners.map((b) => [
        b.title,
        b.subtitle || '',
        b.position,
        b.sortOrder,
        b.status,
        b.isActive ? 'yes' : 'no',
        b.startDate ? new Date(b.startDate).toISOString() : '',
        b.endDate ? new Date(b.endDate).toISOString() : '',
        b.views || 0,
        b.clicks || 0,
        b.views > 0 ? ((b.clicks / b.views) * 100).toFixed(2) : '0.00',
        b.link || '',
        b.imageUrl,
      ]);

      const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="banners-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Export banners CSV error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== AUDIT LOGS ==============
  async getAuditLogs(req, res) {
    try {
      res.json(await adminService.getAuditLogs());
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== HOMEPAGE CMS — COLLECTIONS ==============
  async getCollections(req, res) {
    try {
      const items = await prisma.collection.findMany({
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });
      res.json({ items });
    } catch (error) {
      console.error('Get collections error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createCollection(req, res) {
    try {
      const { name, slug, description, image, color, displayOrder, isActive } = req.body;
      const item = await prisma.collection.create({
        data: {
          name,
          slug,
          description: description || null,
          image: image || null,
          color: color || '#C9A227',
          displayOrder: Number(displayOrder) || 0,
          isActive: isActive !== false,
        },
      });
      res.status(201).json(item);
    } catch (error) {
      console.error('Create collection error:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'A collection with that name or slug already exists' });
      }
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  async updateCollection(req, res) {
    try {
      const { name, slug, description, image, color, displayOrder, isActive } = req.body;
      const item = await prisma.collection.update({
        where: { id: req.params.id },
        data: {
          name,
          slug,
          description: description || null,
          image: image || null,
          color: color || '#C9A227',
          displayOrder: Number(displayOrder) || 0,
          isActive: isActive !== false,
        },
      });
      res.json(item);
    } catch (error) {
      console.error('Update collection error:', error);
      if (error.code === 'P2025') return res.status(404).json({ message: 'Collection not found' });
      if (error.code === 'P2002') return res.status(409).json({ message: 'Name or slug already in use' });
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  async deleteCollection(req, res) {
    try {
      await prisma.collection.delete({ where: { id: req.params.id } });
      res.json({ message: 'Collection deleted successfully' });
    } catch (error) {
      console.error('Delete collection error:', error);
      if (error.code === 'P2025') return res.status(404).json({ message: 'Collection not found' });
      if (error.code === 'P2003') {
        return res.status(409).json({ message: 'Cannot delete — products reference this collection' });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== HOMEPAGE CMS — TESTIMONIALS ==============
  async getTestimonials(req, res) {
    try {
      const items = await prisma.testimonial.findMany({
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      });
      res.json({ items });
    } catch (error) {
      console.error('Get testimonials error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async createTestimonial(req, res) {
    try {
      const { name, city, rating, text, displayOrder, isActive } = req.body;
      const item = await prisma.testimonial.create({
        data: {
          name,
          city: city || null,
          rating: Number(rating) || 5,
          text,
          displayOrder: Number(displayOrder) || 0,
          isActive: isActive !== false,
        },
      });
      res.status(201).json(item);
    } catch (error) {
      console.error('Create testimonial error:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  async updateTestimonial(req, res) {
    try {
      const { name, city, rating, text, displayOrder, isActive } = req.body;
      const item = await prisma.testimonial.update({
        where: { id: req.params.id },
        data: {
          name,
          city: city || null,
          rating: Number(rating) || 5,
          text,
          displayOrder: Number(displayOrder) || 0,
          isActive: isActive !== false,
        },
      });
      res.json(item);
    } catch (error) {
      console.error('Update testimonial error:', error);
      if (error.code === 'P2025') return res.status(404).json({ message: 'Testimonial not found' });
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }

  async deleteTestimonial(req, res) {
    try {
      await prisma.testimonial.delete({ where: { id: req.params.id } });
      res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
      console.error('Delete testimonial error:', error);
      if (error.code === 'P2025') return res.status(404).json({ message: 'Testimonial not found' });
      res.status(500).json({ message: 'Server error' });
    }
  }

  // ============== HOMEPAGE CMS — EDITORIAL ==============
  async getHomepageEditorial(req, res) {
    try {
      let item = await prisma.homepageEditorial.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (!item) {
        item = {
          eyebrow: 'Our Story',
          heading: 'Heirlooms crafted with intention',
          body: '',
          ctaText: 'Read Our Story',
          ctaLink: '/about',
          imageUrl: null,
          statValue: '25+',
          statLabel: 'Years of Trust',
        };
      }
      res.json(item);
    } catch (error) {
      console.error('Get editorial error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  async updateHomepageEditorial(req, res) {
    try {
      const {
        eyebrow, heading, body, ctaText, ctaLink,
        imageUrl, statValue, statLabel, isActive,
      } = req.body;

      const existing = await prisma.homepageEditorial.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      const payload = {
        eyebrow: eyebrow || 'Our Story',
        heading: heading || 'Heirlooms crafted with intention',
        body: body || '',
        ctaText: ctaText || 'Read Our Story',
        ctaLink: ctaLink || '/about',
        imageUrl: imageUrl || null,
        statValue: statValue || '25+',
        statLabel: statLabel || 'Years of Trust',
        isActive: isActive !== false,
      };

      let item;
      if (existing) {
        item = await prisma.homepageEditorial.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        item = await prisma.homepageEditorial.create({ data: payload });
      }
      res.json(item);
    } catch (error) {
      console.error('Update editorial error:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
}

module.exports = new AdminController();