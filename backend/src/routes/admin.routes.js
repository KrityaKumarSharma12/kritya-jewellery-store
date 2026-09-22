const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// All routes require admin authentication
router.use(authenticate, isAdmin);

// ============== DASHBOARD ==============
// Any admin can see the dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============== CATEGORIES ==============
router.get('/categories', requirePermission('view_product'), adminController.getCategories);
router.post('/categories', requirePermission('manage_categories'), adminController.createCategory);
router.put('/categories/:id', requirePermission('manage_categories'), adminController.updateCategory);
router.delete('/categories/:id', requirePermission('manage_categories'), adminController.deleteCategory);

// ============== SUBCATEGORIES ==============
router.get('/subcategories', requirePermission('view_product'), adminController.getSubcategories);
router.post('/subcategories', requirePermission('manage_categories'), adminController.createSubcategory);
router.put('/subcategories/:id', requirePermission('manage_categories'), adminController.updateSubcategory);
router.delete('/subcategories/:id', requirePermission('manage_categories'), adminController.deleteSubcategory);

// ============== DIAMONDS ==============
router.get('/diamonds', requirePermission('view_product'), adminController.getDiamonds);
router.post('/diamonds', requirePermission('manage_metal_rates'), adminController.createDiamond);
router.put('/diamonds/:id', requirePermission('manage_metal_rates'), adminController.updateDiamond);
router.delete('/diamonds/:id', requirePermission('manage_metal_rates'), adminController.deleteDiamond);

// ============== PRODUCTS ==============
router.get('/products', requirePermission('view_product'), adminController.getAllProducts);
router.post('/products', requirePermission('create_product'), adminController.createProduct);
router.put('/products/:id', requirePermission('edit_product'), adminController.updateProduct);
router.delete('/products/:id', requirePermission('delete_product'), adminController.deleteProduct);

// ============== METAL RATES ==============
router.get('/metal-rates', requirePermission('view_product'), adminController.getMetalRates);
router.put('/metal-rates/:id', requirePermission('manage_metal_rates'), adminController.updateMetalRate);
router.get('/metal-options', requirePermission('view_product'), adminController.getMetalOptions);
router.get('/gemstone-options', requirePermission('view_product'), adminController.getGemstoneOptions);
router.post('/metal-rates/bulk-update', requirePermission('manage_metal_rates'), adminController.bulkUpdateMetalRates);
router.get('/metal-rates/history', requirePermission('view_product'), adminController.getMetalRateHistory);

// ============== ORDERS ==============
router.get('/orders', requirePermission('view_order'), adminController.getAllOrders);
router.get('/orders/recent', requirePermission('view_order'), adminController.getRecentOrders);
router.put('/orders/:id/status', requirePermission('edit_order'), adminController.updateOrderStatus);
router.put('/orders/:id/payment', requirePermission('edit_order'), adminController.updatePaymentStatus);

// ============== CUSTOMERS ==============
router.get('/customers', requirePermission('manage_customers'), adminController.getAllCustomers);
router.get('/customers/:id', requirePermission('manage_customers'), adminController.getCustomerById);
router.put('/customers/:id/block', requirePermission('manage_customers'), adminController.blockCustomer);

// ============== INVENTORY ==============
router.get('/inventory', requirePermission('manage_inventory'), adminController.getInventory);
router.post('/inventory/adjust', requirePermission('manage_inventory'), adminController.adjustInventory);

// ============== COUPONS ==============
router.get('/coupons', requirePermission('manage_coupons'), adminController.getCoupons);
router.post('/coupons', requirePermission('manage_coupons'), adminController.createCoupon);
router.put('/coupons/:id', requirePermission('manage_coupons'), adminController.updateCoupon);
router.delete('/coupons/:id', requirePermission('manage_coupons'), adminController.deleteCoupon);

// ============== RETURNS ==============
router.get('/returns', requirePermission('edit_order'), adminController.getReturns);
router.get('/returns/:id', requirePermission('edit_order'), adminController.getReturnById);
router.put('/returns/:id', requirePermission('edit_order'), adminController.updateReturnStatus);

// ============== PAYMENTS ==============
router.get('/payments', requirePermission('view_order'), adminController.getPayments);

// ============== INVOICES ==============
router.get('/invoices', requirePermission('view_order'), adminController.getInvoices);
router.get('/invoices/export/csv', requirePermission('view_order'), adminController.exportInvoicesCsv);
router.post('/invoices/backfill', requirePermission('manage_settings'), adminController.backfillInvoices);
router.get('/invoices/:id', requirePermission('view_order'), adminController.getInvoiceById);
router.get('/invoices/:id/pdf', requirePermission('view_order'), adminController.downloadInvoicePdf);
router.post('/invoices/:orderId/generate', requirePermission('edit_order'), adminController.generateInvoice);

// ============== ABANDONED CARTS ==============
router.get('/abandoned-carts', requirePermission('view_order'), adminController.getAbandonedCarts);
router.get('/abandoned-carts/stats', requirePermission('view_order'), adminController.getAbandonedCartStats);
router.get('/abandoned-carts/export/csv', requirePermission('view_order'), adminController.exportAbandonedCartsCsv);
router.post('/abandoned-carts/detect', requirePermission('manage_settings'), adminController.detectAbandonedCarts);
router.post('/abandoned-carts/:id/remind', requirePermission('view_order'), adminController.sendAbandonedCartReminder);
router.post('/abandoned-carts/:id/recover', requirePermission('view_order'), adminController.markAbandonedCartRecovered);
router.delete('/abandoned-carts/:id', requirePermission('manage_settings'), adminController.deleteAbandonedCart);

// ============== WISHLISTS ==============
router.get('/wishlists', requirePermission('view_order'), adminController.getWishlists);
router.get('/wishlists/stats', requirePermission('view_order'), adminController.getWishlistStats);
router.get('/wishlists/export/csv', requirePermission('view_order'), adminController.exportWishlistsCsv);
router.delete('/wishlists/:id', requirePermission('manage_settings'), adminController.deleteWishlist);

// ============== ADMIN USERS ==============
router.get('/admin-users', requirePermission('manage_users'), adminController.getAdminUsers);
router.post('/admin-users', requirePermission('manage_users'), adminController.createAdminUser);
router.put('/admin-users/:id', requirePermission('manage_users'), adminController.updateAdminUser);
router.delete('/admin-users/:id', requirePermission('manage_users'), adminController.deleteAdminUser);

// ============== AUDIT LOGS ==============
router.get('/audit-logs', requirePermission('manage_users'), adminController.getAuditLogs);

// ============== REPORTS ==============
router.get('/reports/sales', requirePermission('view_reports'), adminController.getSalesReport);
router.get('/reports/products', requirePermission('view_reports'), adminController.getProductReport);
router.get('/reports/export/csv', requirePermission('view_reports'), adminController.exportReportCsv);

// ============== BANNERS ==============
router.get('/banners', requirePermission('manage_banners'), adminController.getBanners);
router.get('/banners/stats', requirePermission('manage_banners'), adminController.getBannerStats);
router.get('/banners/export/csv', requirePermission('manage_banners'), adminController.exportBannersCsv);
router.post('/banners', requirePermission('manage_banners'), adminController.createBanner);
router.patch('/banners/reorder', requirePermission('manage_banners'), adminController.reorderBanners);
router.put('/banners/:id', requirePermission('manage_banners'), adminController.updateBanner);
router.delete('/banners/:id', requirePermission('manage_banners'), adminController.deleteBanner);

// ============== HOMEPAGE CMS — COLLECTIONS ==============
router.get('/collections', requirePermission('manage_cms'), adminController.getCollections);
router.post('/collections', requirePermission('manage_cms'), adminController.createCollection);
router.put('/collections/:id', requirePermission('manage_cms'), adminController.updateCollection);
router.delete('/collections/:id', requirePermission('manage_cms'), adminController.deleteCollection);

// ============== HOMEPAGE CMS — TESTIMONIALS ==============
router.get('/testimonials', requirePermission('manage_cms'), adminController.getTestimonials);
router.post('/testimonials', requirePermission('manage_cms'), adminController.createTestimonial);
router.put('/testimonials/:id', requirePermission('manage_cms'), adminController.updateTestimonial);
router.delete('/testimonials/:id', requirePermission('manage_cms'), adminController.deleteTestimonial);

// ============== HOMEPAGE CMS — EDITORIAL ==============
router.get('/homepage/editorial', requirePermission('manage_cms'), adminController.getHomepageEditorial);
router.put('/homepage/editorial', requirePermission('manage_cms'), adminController.updateHomepageEditorial);

module.exports = router;