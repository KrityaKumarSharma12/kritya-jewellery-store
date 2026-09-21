const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticate, isAdmin);

// ============== DASHBOARD ==============
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============== CATEGORIES ==============
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// ============== SUBCATEGORIES ==============
router.get('/subcategories', adminController.getSubcategories);
router.post('/subcategories', adminController.createSubcategory);
router.put('/subcategories/:id', adminController.updateSubcategory);
router.delete('/subcategories/:id', adminController.deleteSubcategory);

// ============== DIAMONDS ==============
router.get('/diamonds', adminController.getDiamonds);
router.post('/diamonds', adminController.createDiamond);
router.put('/diamonds/:id', adminController.updateDiamond);
router.delete('/diamonds/:id', adminController.deleteDiamond);

// ============== PRODUCTS ==============
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// ============== METAL RATES ==============
router.get('/metal-rates', adminController.getMetalRates);
router.put('/metal-rates/:id', adminController.updateMetalRate);
router.get('/metal-options', adminController.getMetalOptions);
router.get('/gemstone-options', adminController.getGemstoneOptions);
router.post('/metal-rates/bulk-update', adminController.bulkUpdateMetalRates); 
router.get('/metal-rates/history', adminController.getMetalRateHistory);

// ============== ORDERS ==============
router.get('/orders', adminController.getAllOrders);
router.get('/orders/recent', adminController.getRecentOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.put('/orders/:id/payment', adminController.updatePaymentStatus);

// ============== CUSTOMERS ==============
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:id', adminController.getCustomerById);
router.put('/customers/:id/block', adminController.blockCustomer);

// ============== INVENTORY ==============
router.get('/inventory', adminController.getInventory);
router.post('/inventory/adjust', adminController.adjustInventory);

// ============== COUPONS ==============
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// ============== RETURNS ==============
router.get('/returns', adminController.getReturns);
router.get('/returns/:id', adminController.getReturnById); 
router.put('/returns/:id', adminController.updateReturnStatus);

// ============== PAYMENTS ==============
router.get('/payments', adminController.getPayments);

// ============== INVOICES ==============
router.get('/invoices', adminController.getInvoices);
router.get('/invoices/export/csv', adminController.exportInvoicesCsv);
router.post('/invoices/backfill', adminController.backfillInvoices);
router.get('/invoices/:id', adminController.getInvoiceById);
router.get('/invoices/:id/pdf', adminController.downloadInvoicePdf);
router.post('/invoices/:orderId/generate', adminController.generateInvoice);

// ============== ABANDONED CARTS ==============
router.get('/abandoned-carts', adminController.getAbandonedCarts);
router.get('/abandoned-carts/stats', adminController.getAbandonedCartStats);
router.get('/abandoned-carts/export/csv', adminController.exportAbandonedCartsCsv);
router.post('/abandoned-carts/detect', adminController.detectAbandonedCarts);
router.post('/abandoned-carts/:id/remind', adminController.sendAbandonedCartReminder);
router.post('/abandoned-carts/:id/recover', adminController.markAbandonedCartRecovered);
router.delete('/abandoned-carts/:id', adminController.deleteAbandonedCart);

// ============== WISHLISTS ==============
router.get('/wishlists', adminController.getWishlists);
router.get('/wishlists/stats', adminController.getWishlistStats);
router.get('/wishlists/export/csv', adminController.exportWishlistsCsv);
router.delete('/wishlists/:id', adminController.deleteWishlist);

// ============== ADMIN USERS ==============
router.get('/admin-users', adminController.getAdminUsers);
router.post('/admin-users', adminController.createAdminUser);
router.put('/admin-users/:id', adminController.updateAdminUser);
router.delete('/admin-users/:id', adminController.deleteAdminUser);

// ============== AUDIT LOGS ==============
router.get('/audit-logs', adminController.getAuditLogs);

// ============== REPORTS ==============
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/products', adminController.getProductReport);
router.get('/reports/export/csv', adminController.exportReportCsv);

// ============== BANNERS ==============
router.get('/banners', adminController.getBanners);
router.get('/banners/stats', adminController.getBannerStats);
router.get('/banners/export/csv', adminController.exportBannersCsv);
router.post('/banners', adminController.createBanner);
router.patch('/banners/reorder', adminController.reorderBanners);
router.put('/banners/:id', adminController.updateBanner);
router.delete('/banners/:id', adminController.deleteBanner);

// ============== HOMEPAGE CMS — COLLECTIONS ==============
router.get('/collections', adminController.getCollections);
router.post('/collections', adminController.createCollection);
router.put('/collections/:id', adminController.updateCollection);
router.delete('/collections/:id', adminController.deleteCollection);

// ============== HOMEPAGE CMS — TESTIMONIALS ==============
router.get('/testimonials', adminController.getTestimonials);
router.post('/testimonials', adminController.createTestimonial);
router.put('/testimonials/:id', adminController.updateTestimonial);
router.delete('/testimonials/:id', adminController.deleteTestimonial);

// ============== HOMEPAGE CMS — EDITORIAL ==============
router.get('/homepage/editorial', adminController.getHomepageEditorial);
router.put('/homepage/editorial', adminController.updateHomepageEditorial);

module.exports = router;