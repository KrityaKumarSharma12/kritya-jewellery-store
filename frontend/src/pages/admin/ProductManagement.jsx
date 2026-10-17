import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Search,
  Upload, Download,
  Package, Grid, List,
  AlertCircle, Star,
  Sparkles, TrendingUp, Eye, EyeOff
} from 'lucide-react';

import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const ProductManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const filterFromUrl = searchParams.get('filter') || 'all';
  const [productFilter, setProductFilter] = useState(filterFromUrl);

  const [showInactive, setShowInactive] = useState(() => {
    try {
      return localStorage.getItem('adminShowInactiveProducts') === 'true';
    } catch {
      return false;
    }
  });

  const { token } = useAuth();

  useEffect(() => {
    const current = searchParams.get('filter') || 'all';
    if (current !== productFilter) {
      const next = new URLSearchParams(searchParams);
      if (productFilter === 'all') {
        next.delete('filter');
      } else {
        next.set('filter', productFilter);
      }
      setSearchParams(next, { replace: true });
    }
  }, [productFilter, searchParams, setSearchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get('filter') || 'all';
    if (fromUrl !== productFilter) {
      setProductFilter(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem('adminShowInactiveProducts', String(showInactive));
    } catch { /* ignore */ }
  }, [showInactive]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = showInactive
        ? 'http://localhost:5000/api/admin/products?includeInactive=true'
        : 'http://localhost:5000/api/admin/products';

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let productsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if (response.data.products && Array.isArray(response.data.products)) {
          productsData = response.data.products;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          productsData = response.data.data;
        }
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token, showInactive]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setCategories(response.data);
      } else if (response.data.categories && Array.isArray(response.data.categories)) {
        setCategories(response.data.categories);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
      } else {
        setCategories(['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Pendants', 'Anklets']);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Pendants', 'Anklets']);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // ✅ NEW: Toggle active state
  const handleToggleActive = async (product) => {
    const newState = !product.isActive;

    const confirmMessage = newState
      ? `Activate "${product.name}"? It will be visible on the storefront.`
      : `Deactivate "${product.name}"? It will be hidden from the storefront.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await axios.patch(
        `http://localhost:5000/api/admin/products/${product.id}/active`,
        { isActive: newState },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isActive: newState } : p
        )
      );
    } catch (error) {
      console.error('Toggle active error:', error);
      alert(error.response?.data?.message || 'Failed to toggle product status');
    }
  };

  const handleDelete = async (product) => {
    const id = product.id;
    const isActive = product.isActive !== false;

    const confirmMessage = isActive
      ? `Deactivate "${product.name}"?\n\nThis hides it from the storefront but keeps it in your records. Click delete again to permanently remove it.`
      : `PERMANENTLY delete "${product.name}"?\n\nThis cannot be undone. If any orders reference this product, the delete will be blocked.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const url = isActive
        ? `http://localhost:5000/api/admin/products/${id}`
        : `http://localhost:5000/api/admin/products/${id}?permanent=true`;

      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts((prev) => prev.filter((p) => p.id !== id));

      const mode = res.data?.mode;
      if (mode === 'hard') {
        alert('Product permanently deleted.');
      } else {
        alert('Product deactivated. It now appears in "Show Inactive".');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Error deleting product. Please try again.');
    }
  };

  const getCategoryName = (category) => {
    if (!category) return 'Uncategorized';
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && category !== null) {
      return category.name || category.category || 'Uncategorized';
    }
    return 'Uncategorized';
  };

  const getProductName = (product) => {
    if (!product) return 'Unnamed Product';
    if (typeof product === 'string') return product;
    if (typeof product === 'object' && product !== null) {
      return product.name || product.title || 'Unnamed Product';
    }
    return 'Unnamed Product';
  };

  const getProductImages = (product) => {
    if (!product) return ['/api/placeholder/400/400'];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (Array.isArray(product.colorMedia) && product.colorMedia.length > 0) {
      const urls = product.colorMedia
        .filter((m) => m.type === 'image' || !m.type)
        .map((m) => m.url);
      if (urls.length > 0) return urls;
    }
    if (product.image) return [product.image];
    return ['/api/placeholder/400/400'];
  };

  const getProductPrice = (product) => {
    if (!product) return 0;
    if (typeof product.price === 'number') return product.price;
    if (typeof product.price === 'string') return parseFloat(product.price) || 0;
    return 0;
  };

  const getProductStock = (product) => {
    if (!product) return 0;
    if (typeof product.stock === 'number') return product.stock;
    if (typeof product.stock === 'string') return parseInt(product.stock) || 0;
    return 0;
  };

  const getProductSKU = (product) => {
    if (!product) return '';
    return product.sku || product.SKU || '';
  };

  const ProductCard = ({ product }) => {
    if (!product || typeof product !== 'object') return null;

    const images = getProductImages(product);
    const categoryName = getCategoryName(product.category);
    const productName = getProductName(product);
    const price = getProductPrice(product);
    const stock = getProductStock(product);
    const sku = getProductSKU(product);
    const isActive = product.isActive !== undefined ? product.isActive : true;
    const isDynamic = product.hasDynamicProduct === true;

    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden group">
        <div className="relative h-48 sm:h-52 md:h-56 bg-gray-100 dark:bg-gray-800">
          <img
            src={images[0] || '/api/placeholder/400/400'}
            alt={productName}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/api/placeholder/400/400';
            }}
          />
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[calc(100%-1rem)]">
            {isDynamic && (
              <span className="bg-purple-600 text-white px-2 py-1 text-[10px] sm:text-xs rounded flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="h-3 w-3 flex-shrink-0" /> Dynamic
              </span>
            )}
            {product.isFeatured && (
              <span className="bg-gold-600 text-white px-2 py-1 text-[10px] sm:text-xs rounded flex items-center gap-1 whitespace-nowrap">
                <Star className="h-3 w-3 flex-shrink-0" /> Featured
              </span>
            )}
            {product.isNewArrival && (
              <span className="bg-blue-600 text-white px-2 py-1 text-[10px] sm:text-xs rounded flex items-center gap-1 whitespace-nowrap">
                <Sparkles className="h-3 w-3 flex-shrink-0" /> New
              </span>
            )}
            {product.isBestSeller && (
              <span className="bg-green-600 text-white px-2 py-1 text-[10px] sm:text-xs rounded flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="h-3 w-3 flex-shrink-0" /> Best Seller
              </span>
            )}
            {!isActive && (
              <span className="bg-gray-700 text-white px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap">
                Inactive
              </span>
            )}
          </div>
          {stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold px-3 sm:px-4 py-2 bg-red-600 rounded-lg text-sm sm:text-base">Out of Stock</span>
            </div>
          )}
          {stock > 0 && stock < 10 && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 text-[10px] sm:text-xs rounded whitespace-nowrap">
              Low Stock: {stock}
            </div>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{productName}</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{categoryName}</p>
              {sku && <p className="text-xs text-gray-400 truncate">SKU: {sku}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Edit product"
                aria-label="Edit product"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(product)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete product"
                aria-label="Delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between mt-3 gap-2">
            <div className="min-w-0">
              {isDynamic ? (
                <p className="text-sm sm:text-base font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                  Configurable
                </p>
              ) : (
                <p className="text-lg sm:text-xl font-bold text-gold-600 whitespace-nowrap">
                  ₹{price.toLocaleString()}
                </p>
              )}
              <p className="text-xs sm:text-sm text-gray-500">Stock: {stock}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* ✅ NEW: Active/Inactive toggle button (clickable badge) */}
              <button
                onClick={() => handleToggleActive(product)}
                className={`px-2 py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap transition ${
                  isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                }`}
                title={isActive ? 'Click to deactivate' : 'Click to activate'}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter(p => {
        if (!p) return false;

        const isDynamic = p.hasDynamicProduct === true;
        if (productFilter === 'dynamic' && !isDynamic) return false;
        if (productFilter === 'regular' && isDynamic) return false;

        const searchLower = searchTerm.toLowerCase();
        const name = getProductName(p).toLowerCase();
        const category = getCategoryName(p.category).toLowerCase();
        const sku = getProductSKU(p).toLowerCase();
        const matchesSearch =
          name.includes(searchLower) ||
          category.includes(searchLower) ||
          sku.includes(searchLower);

        const matchesCategory =
          selectedCategory === 'all' ||
          getCategoryName(p.category) === selectedCategory;

        return matchesSearch && matchesCategory;
      })
    : [];

  const categoryOptions = Array.isArray(categories)
    ? categories.map(cat => typeof cat === 'string' ? cat : cat?.name || cat?.category || '')
    : ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Pendants', 'Anklets'];

  if (error) {
    return (
      <div className="text-center py-10 sm:py-12 px-4">
        <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4" />
        <p className="text-sm sm:text-base text-red-500">{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  const filterTabs = [
    { id: 'all',     label: 'All Products', count: products.length },
    { id: 'regular', label: 'Regular',      count: products.filter(p => !p.hasDynamicProduct).length },
    { id: 'dynamic', label: 'Dynamic',      count: products.filter(p => p.hasDynamicProduct).length },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Products
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage regular and dynamic jewellery products
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            to="/admin/products/add-product"
            className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Product
          </Link>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm">
            <Upload className="h-4 w-4 sm:h-5 sm:w-5" /> Import
          </button>
          <button className="border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 text-xs sm:text-sm">
            <Download className="h-4 w-4 sm:h-5 sm:w-5" /> Export
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-dark-border overflow-x-auto">
        {filterTabs.map((tab) => {
          const active = productFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProductFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active
                  ? 'border-gold-600 text-gold-600 dark:text-gold-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active
                  ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base w-full sm:w-auto"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`px-3 sm:px-4 py-2 border rounded-lg transition flex items-center gap-2 text-xs sm:text-sm self-start sm:self-auto whitespace-nowrap ${
            showInactive
              ? 'bg-gray-900 text-white border-gray-900 dark:bg-gold-600 dark:border-gold-600'
              : 'border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg'
          }`}
          title={showInactive ? 'Hide inactive products' : 'Show inactive products'}
        >
          {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </button>

        <div className="flex border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition ${viewMode === 'grid' ? 'bg-gold-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-dark-bg'}`}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition ${viewMode === 'list' ? 'bg-gold-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-dark-bg'}`}
            aria-label="List view"
          >
            <List className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 sm:py-12 px-4">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500">
            {productFilter === 'dynamic'
              ? 'No dynamic products found'
              : productFilter === 'regular'
              ? 'No regular products found'
              : 'No products found'}
          </p>
          {productFilter !== 'dynamic' && (
            <Link
              to="/admin/products/add-product"
              className="mt-4 inline-block bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
            >
              Add Your First Product
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product?.id || Math.random()} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductManagement;