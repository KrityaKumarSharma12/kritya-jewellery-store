import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, ShoppingBag, Users, 
  Settings, BarChart3, Tag, 
  RefreshCw, FileText, Image,  
  LogOut, Bell, Menu, X,
  Gem, Activity, Truck, Wallet, ChevronDown,
  Home, Star, 
  Clipboard, UserCog, AlertCircle, Eye, Plus
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

const AdminPanel = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { id: 'products', icon: Package, label: 'Products', path: '/admin/products' },
    { id: 'categories', icon: Home, label: 'Categories', path: '/admin/categories' },
    { id: 'subcategories', icon: Clipboard, label: 'Subcategories', path: '/admin/subcategories' },
    { id: 'diamonds', icon: Gem, label: 'Diamonds', path: '/admin/diamonds' },
    { id: 'inventory', icon: Truck, label: 'Inventory', path: '/admin/inventory' },
    { id: 'metal-rates', icon: Activity, label: 'Metal Rates', path: '/admin/metal-rates' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
    { id: 'customers', icon: Users, label: 'Customers', path: '/admin/customers' },
    { id: 'coupons', icon: Tag, label: 'Coupons', path: '/admin/coupons' },
    { id: 'returns', icon: RefreshCw, label: 'Returns', path: '/admin/returns' },
    { id: 'payments', icon: Wallet, label: 'Payments', path: '/admin/payments' },
    { id: 'invoices', icon: FileText, label: 'Invoices', path: '/admin/invoices' },
    { id: 'wishlist', icon: Star, label: 'Wishlist', path: '/admin/wishlist' },
    { id: 'abandoned-cart', icon: AlertCircle, label: 'Abandoned Cart', path: '/admin/abandoned-cart' },
    { id: 'banners', icon: Image, label: 'Banners', path: '/admin/banners' },
    { id: 'reports', icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { id: 'admin-users', icon: UserCog, label: 'Admin Users', path: '/admin/admin-users' },
    { id: 'audit-logs', icon: Eye, label: 'Audit Logs', path: '/admin/audit-logs' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/admin/settings' },
    { id: 'add-product', icon: Plus, label: 'Add Product', path: '/admin/products/add-product' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex">
      {/* Backdrop for mobile — shown when sidebar is open on small screens */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 lg:w-20 -translate-x-full lg:translate-x-0'}
          bg-white dark:bg-dark-card shadow-2xl min-h-screen fixed left-0 top-0 z-40 transition-all duration-300 overflow-y-auto
        `}
      >
        {/* Logo */}
        <div
          className={`border-b border-gray-100 dark:border-dark-border transition-all duration-300 ${
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

        {/* Close button — only visible on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navigation */}
        <nav
          className={`space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'p-4' : 'lg:p-2'
          }`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => {
                  setActiveTab(item.id);
                  // Auto-close sidebar on mobile after click
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center rounded-xl transition-all duration-300 ${
                  sidebarOpen ? 'gap-3 px-4 py-3' : 'lg:justify-center lg:p-3'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 text-gold-600 dark:text-gold-400 shadow-lg'
                    : 'hover:bg-gray-50 dark:hover:bg-dark-bg text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — Logout */}
        <div
          className={`absolute bottom-0 left-0 right-0 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card transition-all duration-300 ${
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
                {activeTab.replace('-', ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Theme Toggle */}
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
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
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/categories" element={<CategoryManagement />} />
            <Route path="/subcategories" element={<SubcategoryManagement />} />
            <Route path="/diamonds" element={<DiamondManagement />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/metal-rates" element={<MetalRateManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/coupons" element={<CouponManagement />} />
            <Route path="/returns" element={<ReturnManagement />} />
            <Route path="/payments" element={<PaymentManagement />} />
            <Route path="/invoices" element={<InvoiceManagement />} />
            <Route path="/wishlist" element={<WishlistManagement />} />
            <Route path="/abandoned-cart" element={<AbandonedCart />} />
            <Route path="/banners" element={<BannerManagement />} />
            <Route path="/reports" element={<ReportAnalytics />} />
            <Route path="/admin-users" element={<AdminUserManagement />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/products/add-product" element={<AddProductPage />} />
            <Route path="/products/edit/:id" element={<AddProductPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;