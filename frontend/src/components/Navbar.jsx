import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, User, Menu, X, Search, Heart, 
  ChevronDown, Sparkles,
  Gem, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ThemeToggle from './ThemeToggle';

// Custom icon components
const EarringsIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="10" r="3" />
    <path d="M12 7v-2" />
    <path d="M12 13v8" />
    <path d="M8 15c-2 0-4-1-4-3s2-3 4-3" />
    <path d="M16 15c2 0 4-1 4-3s-2-3-4-3" />
  </svg>
);

const BraceletIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M6 12c0-3 2-5 6-5s6 2 6 5-2 5-6 5-6-2-6-5z" />
    <path d="M8 12c0-2 1.5-3 4-3s4 1 4 3" />
    <path d="M4 8c0-2 1.5-3 4-3" />
    <path d="M20 8c0-2-1.5-3-4-3" />
  </svg>
);

const AnkletIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M6 16c0-3 2-5 6-5s6 2 6 5" />
    <path d="M8 16c0-2 1.5-3 4-3s4 1 4 3" />
    <circle cx="12" cy="12" r="2" />
    <path d="M9 16c0 2 1.5 3 3 3s3-1 3-3" />
  </svg>
);

// Custom Ring Icon
const RingIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3" />
    <path d="M12 18v3" />
  </svg>
);

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { name: 'Necklaces', icon: Gem, link: '/products?category=Necklaces' },
    { name: 'Rings', icon: RingIcon, link: '/products?category=Rings' },
    { name: 'Earrings', icon: EarringsIcon, link: '/products?category=Earrings' },
    { name: 'Bracelets', icon: BraceletIcon, link: '/products?category=Bracelets' },
    { name: 'Pendants', icon: Sparkles, link: '/products?category=Pendants' },
    { name: 'Anklets', icon: AnkletIcon, link: '/products?category=Anklets' },
  ];

  // ✅ NEW: Collections dropdown items
  const collections = [
    { name: 'Wedding Collection', link: '/products?category=Wedding' },
    { name: 'Bridal Collection', link: '/products?category=Bridal' },
    { name: 'Festival Collection', link: '/products?category=Festival' },
    { name: 'Daily Wear', link: '/products?category=Daily' },
    { name: 'Premium Collection', link: '/products?category=Premium' },
    { name: 'Gift Cards', link: '/gift-cards' },
  ];

  // ✅ NEW: Extra top-level links (desktop nav + mobile menu)
  const extraLinks = [
    { name: 'New Arrivals', link: '/products?sort=newest' },
    { name: 'Offers', link: '/products?sort=discount' },
    { name: 'About', link: '/about' },
    { name: 'Contact', link: '/contact' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${searchQuery}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Bar — desktop only, unchanged */}
      <div className="hidden lg:block bg-gradient-to-r from-gold-600 to-gold-700 dark:from-gold-800 dark:to-gold-900 text-white text-xs py-1.5">
        <div className="container-custom flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span>✨ Free Shipping on orders above ₹5000</span>
            <span>📦 30-Day Easy Returns</span>
            <span>💎 Premium Quality Guaranteed</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/track-order" className="hover:text-gold-200 transition">
              Track Order
            </Link>
            <Link to="/contact" className="hover:text-gold-200 transition">
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`sticky top-0 z-50 transition-all duration-500 border-b ${
          isScrolled 
            ? 'bg-white/90 dark:bg-dark-bg/90 backdrop-blur-xl shadow-lg border-transparent dark:border-dark-border' 
            : 'bg-white dark:bg-dark-bg border-gray-100 dark:border-dark-border'
        }`}
      >
        <div className="container-custom">
          <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center group min-w-0 flex-shrink-0">
              <img
                src="/kritya-logo-2.png"
                alt="Kritya's Jewellery"
                className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                draggable={false}
              />
            </Link>

            {/* Desktop Navigation — xl and up only */}
            <div className="hidden xl:flex items-center space-x-4 2xl:space-x-8">
              <Link 
                to="/products" 
                className="text-sm text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition relative group whitespace-nowrap"
              >
                Shop All
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold-600 dark:bg-gold-400 group-hover:w-full transition-all duration-300"></span>
              </Link>
              
              {/* Categories Dropdown */}
              <div className="relative group">
                <button className="text-sm text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition flex items-center gap-1 whitespace-nowrap">
                  Categories <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-dark-card rounded-xl shadow-premium dark:shadow-2xl dark:shadow-black/40 border border-transparent dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                  <div className="p-4 space-y-2">
                    {categories.map((category) => (
                      <Link
                        key={category.name}
                        to={category.link}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 transition"
                      >
                        <category.icon className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                        <span className="text-gray-700 dark:text-gray-200">{category.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* ✅ NEW: Collections Dropdown */}
              <div className="relative group">
                <button className="text-sm text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition flex items-center gap-1 whitespace-nowrap">
                  Collections <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-dark-card rounded-xl shadow-premium dark:shadow-2xl dark:shadow-black/40 border border-transparent dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                  <div className="p-4 space-y-2">
                    {collections.map((c) => (
                      <Link
                        key={c.name}
                        to={c.link}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 transition"
                      >
                        <Sparkles className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                        <span className="text-gray-700 dark:text-gray-200 text-sm">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* ✅ NEW: Extra top-level links */}
              {extraLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.link}
                  className="text-sm text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition relative group whitespace-nowrap"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold-600 dark:bg-gold-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
              ))}
            </div>

            {/* Right Section — icon buttons */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 flex-shrink-0">
              {/* Search */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                aria-label="Search"
                className="p-1.5 sm:p-2 text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition rounded-full hover:bg-gray-100 dark:hover:bg-dark-card"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>

              {/* Theme Toggle — hidden below sm to save space on tiny phones */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* Wishlist — hidden below md to save space */}
              <Link 
                to="/wishlist" 
                aria-label="Wishlist"
                className="hidden md:inline-flex relative p-1.5 sm:p-2 text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition rounded-full hover:bg-gray-100 dark:hover:bg-dark-card"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>

              {/* Cart */}
              <Link 
                to="/cart" 
                aria-label="Cart"
                className="relative p-1.5 sm:p-2 text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition rounded-full hover:bg-gray-100 dark:hover:bg-dark-card"
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {getTotalItems() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-gold-600 dark:bg-gold-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center shadow-md"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-card transition">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center text-white font-bold shadow-md text-[10px] sm:text-xs md:text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="hidden md:block h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500 dark:text-gray-400 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] bg-white dark:bg-dark-card rounded-xl shadow-premium dark:shadow-2xl dark:shadow-black/40 border border-transparent dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-dark-border">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition text-gray-700 dark:text-gray-200">
                        <User className="h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition text-gray-700 dark:text-gray-200">
                          <TrendingUp className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition mt-2 border-t border-gray-100 dark:border-dark-border pt-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 dark:from-gold-600 dark:to-gold-700 dark:hover:from-gold-500 dark:hover:to-gold-600 text-white rounded-full font-medium transition shadow-lg hover:shadow-xl dark:shadow-gold-900/30 text-xs sm:text-sm whitespace-nowrap"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Toggle — only below xl */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                className="xl:hidden p-1.5 sm:p-2 text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition rounded-full hover:bg-gray-100 dark:hover:bg-dark-card"
              >
                {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="py-3 sm:py-4 border-t border-gray-100 dark:border-dark-border"
              >
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search for jewellery, collections, materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-9 sm:pl-12 pr-20 sm:pr-24 bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-400 text-sm sm:text-base text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition"
                    autoFocus
                  />
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                  <button
                    type="submit"
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-2.5 sm:px-4 py-1.5 bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white rounded-lg font-medium transition text-xs sm:text-sm"
                  >
                    Search
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="xl:hidden fixed inset-x-0 top-14 sm:top-16 md:top-20 bg-white dark:bg-dark-bg shadow-xl dark:shadow-2xl dark:shadow-black/40 z-40 overflow-y-auto max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] border-t border-gray-100 dark:border-dark-border"
          >
            <div className="container-custom py-4 sm:py-6 space-y-4">
              {/* ✅ NEW: Collections shortcut row on mobile */}
              <div className="flex flex-wrap gap-2">
                {extraLinks.map((item) => (
                  <Link
                    key={item.name}
                    to={item.link}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-1.5 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 text-xs font-medium rounded-full border border-gold-200 dark:border-gold-800 hover:bg-gold-100 dark:hover:bg-gold-900/40 transition"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Categories */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {categories.map((category) => (
                  <Link
                    key={category.name}
                    to={category.link}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-dark-card rounded-xl hover:bg-gold-50 dark:hover:bg-gold-900/20 transition border border-transparent dark:border-dark-border min-w-0"
                  >
                    <category.icon className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 dark:text-gold-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{category.name}</span>
                  </Link>
                ))}
              </div>

              {/* ✅ NEW: Collections section header + list */}
              <div className="border-t border-gray-100 dark:border-dark-border pt-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Collections
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {collections.map((c) => (
                    <Link
                      key={c.name}
                      to={c.link}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-dark-card rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 transition min-w-0"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-gold-600 dark:text-gold-400 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-dark-border pt-4 space-y-2 sm:space-y-3">
                <Link to="/products" className="block py-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition" onClick={() => setIsMenuOpen(false)}>
                  Shop All
                </Link>
                {/* Wishlist link — visible in mobile menu since it's hidden in the top bar on small screens */}
                <Link to="/wishlist" className="block py-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition md:hidden" onClick={() => setIsMenuOpen(false)}>
                  Wishlist
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link to="/profile" className="block py-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition" onClick={() => setIsMenuOpen(false)}>
                      My Profile
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="block py-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition" onClick={() => setIsMenuOpen(false)}>
                        Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLogout} className="block w-full text-left py-2 text-sm sm:text-base text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                      Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="block py-2 text-sm sm:text-base text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 transition font-semibold" onClick={() => setIsMenuOpen(false)}>
                    Sign In / Register
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;