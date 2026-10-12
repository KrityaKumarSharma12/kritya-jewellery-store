import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Settings, BarChart3, Tag,
  RefreshCw, FileText, Image,
  LogOut, Bell, Menu, X,
  Gem, Activity, Truck, Wallet, ChevronDown, ChevronRight,
  Home, Star,
  Clipboard, UserCog, AlertCircle, Eye, Plus,
  FolderOpen, Layers, Sparkles, Ruler, Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Dashboard from './admin/Dashboard';
import ProductManagement from './admin/ProductManagement';
import CategoryManagement from './admin/CategoryManagement';
import SubcategoryManagement from './admin/SubcategoryManagement';
import OrderManagement from './admin/OrderManagement';
import CustomerManagement from './admin/CustomerManagement';
import MetalRateManagement from './admin/MetalRateManagement';
import CouponManagement from './admin/CouponManagement';
import ReportAnalytics from './admin/ReportAnalytics';
import SettingsPage from './admin/SettingsPage';
import InventoryManagement from './admin/InventoryManagement';
import BannerManagement from './admin/BannerManagement';
import DiamondManagement from './admin/DiamondManagement';
import InvoiceManagement from './admin/InvoiceManagement';
import ReturnManagement from './admin/ReturnManagement';
import PaymentManagement from './admin/PaymentManagement';
import AdminUserManagement from './admin/AdminUserManagement';
import AuditLogs from './admin/AuditLogs';
import AbandonedCart from './admin/AbandonedCart';
import WishlistManagement from './admin/WishlistManagement';
import AddProductPage from './admin/AddProductPage';

// Placeholder pages (to be built out later)
import DynamicProductsPage from './admin/DynamicProductsPage';
import SizeManagementPage from './admin/SizeManagementPage';
import ProductStylesPage from './admin/ProductStylesPage';
import CollectionsPage from './admin/CollectionsPage';
import OccasionsPage from './admin/OccasionsPage';
import KarigarsPage from './admin/KarigarsPage';
import LowStockPage from './admin/LowStockPage';
import StockAdjustmentsPage from './admin/StockAdjustmentsPage';

// ============================================================
// Menu structure — grouped
//
// Each entry is either:
//   - type: 'single' → direct Link to `path`
//   - type: 'group'  → collapsible parent, has `children[]`
//
// Every item can declare a `permission`. Items with no
// permission are visible to all admins.
// ============================================================
const menuGroups = [
  {
    id: 'dashboard',
    type: 'single',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
  },

  {
    id: 'master-panel',
    type: 'group',
    label: 'Master Panel',
    icon: FolderOpen,
    children: [
      { id: 'categories',      label: 'Categories',      icon: Home,      path: '/admin/categories',      permission: 'manage_categories' },
      { id: 'subcategories',   label: 'Subcategories',   icon: Clipboard, path: '/admin/subcategories',   permission: 'manage_categories' },
      { id: 'product-styles',  label: 'Product Styles',  icon: Sparkles,  path: '/admin/product-styles' },
      { id: 'collections',     label: 'Collections',     icon: Layers,    path: '/admin/collections' },
      { id: 'occasions',       label: 'Occasions',       icon: Star,      path: '/admin/occasions' },
      { id: 'diamonds',        label: 'Diamonds',        icon: Gem,       path: '/admin/diamonds',        permission: 'view_product' },
      { id: 'metal-rates',     label: 'Metal Rates',     icon: Activity,  path: '/admin/metal-rates',     permission: 'view_product' },
      { id: 'size-management', label: 'Size Management', icon: Ruler,     path: '/admin/size-management' },
      { id: 'karigars',        label: 'Karigars',        icon: Wrench,    path: '/admin/karigars' },
    ],
  },

  {
    id: 'products',
    type: 'group',
    label: 'Products',
    icon: Package,
    children: [
      { id: 'products',         label: 'All Products',       icon: Package,     path: '/admin/products',             permission: 'view_product' },
      { id: 'dynamic-products', label: 'Dynamic Products',   icon: Sparkles,    path: '/admin/dynamic-products' },
      { id: 'add-product',      label: 'Add Product',        icon: Plus,        path: '/admin/products/add-product', permission: 'create_product' },
      { id: 'low-stock',        label: 'Low & Out of Stock', icon: AlertCircle, path: '/admin/low-stock' },
    ],
  },

  {
    id: 'inventory',
    type: 'group',
    label: 'Inventory',
    icon: Truck,
    children: [
      { id: 'inventory',         label: 'Stock Overview', icon: Truck,     path: '/admin/inventory',         permission: 'manage_inventory' },
      { id: 'stock-adjustments', label: 'Adjustments',    icon: RefreshCw, path: '/admin/stock-adjustments' },
    ],
  },

  {
    id: 'orders',
    type: 'group',
    label: 'Orders',
    icon: ShoppingBag,
    children: [
      { id: 'orders',  label: 'All Orders', icon: ShoppingBag, path: '/admin/orders',  permission: 'view_order' },
      { id: 'returns', label: 'Returns',    icon: RefreshCw,   path: '/admin/returns', permission: 'edit_order' },
    ],
  },

  {
    id: 'customers',
    type: 'group',
    label: 'Customers',
    icon: Users,
    children: [
      { id: 'customers',      label: 'All Customers',   icon: Users,       path: '/admin/customers',      permission: 'manage_customers' },
      { id: 'wishlist',       label: 'Wishlists',       icon: Star,        path: '/admin/wishlist',       permission: 'view_order' },
      { id: 'abandoned-cart', label: 'Abandoned Carts', icon: AlertCircle, path: '/admin/abandoned-cart', permission: 'view_order' },
    ],
  },

  {
    id: 'marketing',
    type: 'group',
    label: 'Marketing',
    icon: Tag,
    children: [
      { id: 'coupons', label: 'Coupons', icon: Tag,   path: '/admin/coupons', permission: 'manage_coupons' },
      { id: 'banners', label: 'Banners', icon: Image, path: '/admin/banners', permission: 'manage_banners' },
    ],
  },

  {
    id: 'finance',
    type: 'group',
    label: 'Finance',
    icon: Wallet,
    children: [
      { id: 'payments', label: 'Payments', icon: Wallet,    path: '/admin/payments', permission: 'view_order' },
      { id: 'invoices', label: 'Invoices', icon: FileText,  path: '/admin/invoices', permission: 'view_order' },
      { id: 'reports',  label: 'Reports',  icon: BarChart3, path: '/admin/reports',  permission: 'view_reports' },
    ],
  },

  {
    id: 'system',
    type: 'group',
    label: 'System',
    icon: Settings,
    children: [
      { id: 'admin-users', label: 'Admin Users', icon: UserCog,  path: '/admin/admin-users', permission: 'manage_users' },
      { id: 'audit-logs',  label: 'Audit Logs',  icon: Eye,      path: '/admin/audit-logs',  permission: 'manage_users' },
      { id: 'settings',    label: 'Settings',    icon: Settings, path: '/admin/settings',    permission: 'manage_settings' },
    ],
  },
];

// ============================================================
// Permission gate — unchanged
// ============================================================
const PermissionGate = ({ permission, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You don't have permission to view this page. Contact your administrator
          if you believe this is a mistake.
        </p>
      </div>
    );
  }
  return children;
};

// ============================================================
// AdminPanel
// ============================================================
const AdminPanel = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Groups closed by default; auto-expand logic below will open the
  // one containing the active route. Persisted in localStorage.
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const raw = localStorage.getItem('adminSidebarGroups');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return menuGroups.reduce((acc, g) => {
      if (g.type === 'group') acc[g.id] = false;
      return acc;
    }, {});
  });

  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Persist open groups
  useEffect(() => {
    try {
      localStorage.setItem('adminSidebarGroups', JSON.stringify(openGroups));
    } catch (_) {}
  }, [openGroups]);

  // Derive active item + group from URL
  const { activeItemId, activeGroupId } = (() => {
    const path = location.pathname;
    for (const g of menuGroups) {
      if (g.type === 'single') {
        if (g.path === path) return { activeItemId: g.id, activeGroupId: null };
      }
      if (g.type === 'group') {
        for (const c of g.children) {
          if (c.path === path || (c.path !== '/admin' && path.startsWith(c.path + '/'))) {
            return { activeItemId: c.id, activeGroupId: g.id };
          }
        }
      }
    }
    return { activeItemId: null, activeGroupId: null };
  })();

  // Auto-expand the group containing the active item
  useEffect(() => {
    if (activeGroupId && !openGroups[activeGroupId]) {
      setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));
    }
  }, [activeGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterChildren = (children) =>
    children.filter((c) => !c.permission || hasPermission(c.permission));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar — flex column, nav scrolls, logout pinned */}
      <div
        className={`
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 lg:w-20 -translate-x-full lg:translate-x-0'}
          bg-white dark:bg-dark-card shadow-2xl h-screen fixed left-0 top-0 z-40 transition-all duration-300 flex flex-col
        `}
      >
        {/* Logo */}
        <div
          className={`flex-shrink-0 border-b border-gray-100 dark:border-dark-border transition-all duration-300 ${
            sidebarOpen ? 'p-4' : 'lg:p-2 lg:flex lg:justify-center'
          }`}
        >
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'lg:justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <span className="text-xl font-playfair font-bold text-gold-600 dark:text-gold-400">Admin</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 tracking-widest uppercase">Panel</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navigation — scrollable */}
        <nav
          className={`space-y-1 flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'p-4' : 'lg:p-2'
          }`}
        >
          {menuGroups.map((group) => {
            // Single-link item (e.g., Dashboard)
            if (group.type === 'single') {
              const Icon = group.icon;
              const isActive = activeItemId === group.id;
              return (
                <Link
                  key={group.id}
                  to={group.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  title={!sidebarOpen ? group.label : undefined}
                  className={`flex items-center rounded-xl transition-all duration-300 ${
                    sidebarOpen ? 'gap-3 px-4 py-3' : 'lg:justify-center lg:p-3'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 text-gold-600 dark:text-gold-400 shadow-lg'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-bg text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium text-sm">{group.label}</span>}
                </Link>
              );
            }

            // Group (collapsible)
            const Icon = group.icon;
            const children = filterChildren(group.children);
            if (children.length === 0) return null;

            const isOpen = !!openGroups[group.id];
            const hasActiveChild = activeGroupId === group.id;

            // When collapsed, groups become just an icon
            if (!sidebarOpen) {
              return (
                <div
                  key={group.id}
                  title={group.label}
                  className={`flex justify-center p-3 rounded-xl transition-all duration-300 ${
                    hasActiveChild
                      ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 text-gold-600 dark:text-gold-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                </div>
              );
            }

            return (
              <div key={group.id} className="pt-1">
                {/* Group header — highlighted when a child is active */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-xs font-semibold uppercase tracking-wider ${
                    hasActiveChild
                      ? 'bg-gold-50/70 dark:bg-gold-900/15 text-gold-700 dark:text-gold-400'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>

                {/* Group children */}
                {isOpen && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {children.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeItemId === item.id;
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) setSidebarOpen(false);
                          }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 text-gold-600 dark:text-gold-400 shadow-sm'
                              : 'hover:bg-gray-50 dark:hover:bg-dark-bg text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <ItemIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout — pinned via flex, not fixed */}
        <div
          className={`flex-shrink-0 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 ${
            sidebarOpen ? 'p-4' : 'lg:p-2'
          }`}
        >
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition ${
              sidebarOpen ? 'gap-3 px-4 py-3' : 'lg:justify-center lg:p-3'
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0 lg:ml-20'} flex-1 transition-all duration-300 min-w-0`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white dark:bg-dark-card shadow-sm dark:shadow-lg dark:shadow-black/20 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2 border-b border-transparent dark:border-dark-border">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition text-gray-700 dark:text-gray-200 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 dark:text-white capitalize truncate">
                {location.pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle />
            <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 md:gap-3 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role?.replace(/_/g, ' ') || 'Administrator'}</p>
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] bg-white dark:bg-dark-card rounded-xl shadow-2xl py-2 z-50 border border-gray-100 dark:border-dark-border">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link to="/admin/profile" className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-dark-bg transition text-sm text-gray-700 dark:text-gray-200">
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition text-sm border-t border-gray-100 dark:border-dark-border mt-2 pt-2"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<PermissionGate permission="view_product"><ProductManagement /></PermissionGate>} />
            <Route path="/products/add-product" element={<PermissionGate permission="create_product"><AddProductPage /></PermissionGate>} />
            <Route path="/products/edit/:id" element={<PermissionGate permission="edit_product"><AddProductPage /></PermissionGate>} />

            <Route path="/dynamic-products" element={<DynamicProductsPage />} />

            <Route path="/categories" element={<PermissionGate permission="manage_categories"><CategoryManagement /></PermissionGate>} />
            <Route path="/subcategories" element={<PermissionGate permission="manage_categories"><SubcategoryManagement /></PermissionGate>} />
            <Route path="/product-styles" element={<ProductStylesPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/occasions" element={<OccasionsPage />} />
            <Route path="/diamonds" element={<PermissionGate permission="view_product"><DiamondManagement /></PermissionGate>} />
            <Route path="/metal-rates" element={<PermissionGate permission="view_product"><MetalRateManagement /></PermissionGate>} />
            <Route path="/size-management" element={<SizeManagementPage />} />
            <Route path="/karigars" element={<KarigarsPage />} />

            <Route path="/low-stock" element={<LowStockPage />} />

            <Route path="/inventory" element={<PermissionGate permission="manage_inventory"><InventoryManagement /></PermissionGate>} />
            <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />

            <Route path="/orders" element={<PermissionGate permission="view_order"><OrderManagement /></PermissionGate>} />
            <Route path="/returns" element={<PermissionGate permission="edit_order"><ReturnManagement /></PermissionGate>} />

            <Route path="/customers" element={<PermissionGate permission="manage_customers"><CustomerManagement /></PermissionGate>} />
            <Route path="/wishlist" element={<PermissionGate permission="view_order"><WishlistManagement /></PermissionGate>} />
            <Route path="/abandoned-cart" element={<PermissionGate permission="view_order"><AbandonedCart /></PermissionGate>} />

            <Route path="/coupons" element={<PermissionGate permission="manage_coupons"><CouponManagement /></PermissionGate>} />
            <Route path="/banners" element={<PermissionGate permission="manage_banners"><BannerManagement /></PermissionGate>} />

            <Route path="/payments" element={<PermissionGate permission="view_order"><PaymentManagement /></PermissionGate>} />
            <Route path="/invoices" element={<PermissionGate permission="view_order"><InvoiceManagement /></PermissionGate>} />
            <Route path="/reports" element={<PermissionGate permission="view_reports"><ReportAnalytics /></PermissionGate>} />

            <Route path="/admin-users" element={<PermissionGate permission="manage_users"><AdminUserManagement /></PermissionGate>} />
            <Route path="/audit-logs" element={<PermissionGate permission="manage_users"><AuditLogs /></PermissionGate>} />
            <Route path="/settings" element={<PermissionGate permission="manage_settings"><SettingsPage /></PermissionGate>} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;