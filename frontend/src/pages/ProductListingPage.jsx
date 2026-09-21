import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, X } from 'lucide-react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';

const ProductListingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    search: searchParams.get('search') || '',
    material: 'all',
    rating: 'all',
    inStock: false,
  });

  // ⭐ Category IDs match DB values (singular)
  const categories = [
    { id: 'all',       name: 'All Products', icon: '✨' },
    { id: 'Necklace',  name: 'Necklaces',    icon: '📿' },
    { id: 'Ring',      name: 'Rings',        icon: '💍' },
    { id: 'Earring',   name: 'Earrings',     icon: '📿' },
    { id: 'Bracelet',  name: 'Bracelets',    icon: '📿' },
    { id: 'Bangle',    name: 'Bangles',      icon: '💫' },
    { id: 'Pendant',   name: 'Pendants',     icon: '💎' },
    { id: 'Anklet',    name: 'Anklets',      icon: '⛓️' },
  ];

  // ⭐ Material values match DB (GOLD, WHITE_GOLD, ROSE_GOLD, etc.)
  const materials = [
    { value: 'all',        label: 'All Materials' },
    { value: 'GOLD',       label: 'Gold' },
    { value: 'WHITE_GOLD', label: 'White Gold' },
    { value: 'ROSE_GOLD',  label: 'Rose Gold' },
    { value: 'SILVER',     label: 'Silver' },
    { value: 'PLATINUM',   label: 'Platinum' },
    { value: 'PALLADIUM',  label: 'Palladium' },
    { value: 'DIAMOND',    label: 'Diamond' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  // ✅ Sync URL params → filters when they change externally
  useEffect(() => {
    const urlCategory = searchParams.get('category') || 'all';
    const urlSearch = searchParams.get('search') || '';
    setFilters((prev) => {
      if (prev.category === urlCategory && prev.search === urlSearch) return prev;
      return { ...prev, category: urlCategory, search: urlSearch };
    });
  }, [searchParams]);

  // ============== FETCH ==============
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.material && filters.material !== 'all') params.append('material', filters.material);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.search) params.append('search', filters.search);
      if (filters.inStock) params.append('inStock', 'true');

      const response = await axios.get(`http://localhost:5000/api/products?${params}`);

      let productsData = response.data?.products || response.data || [];
      if (!Array.isArray(productsData)) productsData = [];

      // ✅ Material + inStock are now filtered server-side.
      // No client-side re-filtering needed.

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const sortProducts = (list) => {
    switch (filters.sort) {
      case 'price-low':
        return [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high':
        return [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'popular':
        return [...list].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      case 'rating':
        return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return list;
    }
  };

  const sortedProducts = sortProducts(products);

  // ============== FILTER HANDLERS ==============
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });

    if (key === 'category' || key === 'search') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all' || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      search: '',
      material: 'all',
      rating: 'all',
      inStock: false,
    });
    setSearchParams({});
  };

  // ============== ACTIVE FILTER COUNT ==============
  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.material !== 'all' ? 1 : 0) +
    (filters.inStock ? 1 : 0);

  // Get display label for the current material filter chip
  const currentMaterialLabel =
    materials.find((m) => m.value === filters.material)?.label || filters.material;

  // Get display label for the current category filter chip
  const currentCategoryLabel =
    categories.find((c) => c.id === filters.category)?.name || filters.category;

  return (
    <div className="container-custom py-4 sm:py-6 lg:py-8">
      {/* ============== HEADER ============== */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Title + count */}
          <div className="flex items-baseline justify-between gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
              {filters.category !== 'all' ? currentCategoryLabel : 'All Products'}
            </h1>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
              {products.length} item{products.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Mobile Filters Button */}
            <button
              onClick={() => setShowFilters(true)}
              className="md:hidden flex items-center gap-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition text-gray-700 dark:text-gray-200 flex-shrink-0"
            >
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-gold-600 text-white text-xs rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Toggle */}
            <div className="flex border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 transition ${
                  viewMode === 'grid'
                    ? 'bg-gold-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-200'
                }`}
              >
                <Grid className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 transition ${
                  viewMode === 'list'
                    ? 'bg-gold-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-200'
                }`}
              >
                <List className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="ml-auto px-2.5 sm:px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-xs sm:text-sm max-w-[160px] sm:max-w-none truncate"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ============== ACTIVE FILTERS ============== */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
            {filters.category !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                Category: {currentCategoryLabel}
                <button
                  onClick={() => handleFilterChange('category', 'all')}
                  aria-label="Remove category filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {filters.minPrice && (
              <span className="inline-flex items-center gap-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                Min: ₹{filters.minPrice}
                <button onClick={() => handleFilterChange('minPrice', '')} aria-label="Remove min price">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {filters.maxPrice && (
              <span className="inline-flex items-center gap-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                Max: ₹{filters.maxPrice}
                <button onClick={() => handleFilterChange('maxPrice', '')} aria-label="Remove max price">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {filters.material !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                Material: {currentMaterialLabel}
                <button onClick={() => handleFilterChange('material', 'all')} aria-label="Remove material">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {filters.inStock && (
              <span className="inline-flex items-center gap-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                In Stock Only
                <button onClick={() => handleFilterChange('inStock', false)} aria-label="Remove in-stock filter">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ============== MAIN LAYOUT ============== */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* ========== FILTER SIDEBAR — desktop ========== */}
        <aside className="hidden md:block md:w-64 lg:w-72 flex-shrink-0">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-5 lg:p-6 md:sticky md:top-24">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg lg:text-xl font-playfair font-bold text-gray-800 dark:text-white">
                Filters
              </h3>
            </div>

            {/* Categories */}
            <div className="mb-5">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                <span className="text-gold-600">📂</span> Categories
              </h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      value={cat.id}
                      checked={filters.category === cat.id}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500"
                    />
                    <span className="ml-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gold-600 transition">
                      <span>{cat.icon}</span>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-5">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                <span className="text-gold-600">💰</span> Price Range
              </h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-1/2 px-2.5 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-1/2 px-2.5 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Material */}
            <div className="mb-5">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                <span className="text-gold-600">💎</span> Material
              </h4>
              <div className="space-y-2">
                {materials.map((mat) => (
                  <label key={mat.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="material"
                      value={mat.value}
                      checked={filters.material === mat.value}
                      onChange={(e) => handleFilterChange('material', e.target.value)}
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {mat.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="mb-5">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                <span className="text-gold-600">📦</span> Availability
              </h4>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                  className="h-4 w-4 text-gold-600 focus:ring-gold-500 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  In Stock Only
                </span>
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="w-full bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-dark-card text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold transition text-sm"
            >
              Reset All Filters
            </button>
          </div>
        </aside>

        {/* ========== FILTER SIDEBAR — mobile drawer ========== */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowFilters(false)}
            />

            <div className="relative ml-auto w-full max-w-sm bg-white dark:bg-dark-card h-full overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border p-4 flex justify-between items-center z-10">
                <h3 className="text-lg font-playfair font-bold text-gray-800 dark:text-white">
                  Filters
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Categories */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                    <span className="text-gold-600">📂</span> Categories
                  </h4>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="category-mobile"
                          value={cat.id}
                          checked={filters.category === cat.id}
                          onChange={(e) => {
                            handleFilterChange('category', e.target.value);
                            setShowFilters(false);
                          }}
                          className="h-4 w-4 text-gold-600 focus:ring-gold-500"
                        />
                        <span className="ml-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span>{cat.icon}</span>
                          {cat.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                    <span className="text-gold-600">💰</span> Price Range
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Material */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                    <span className="text-gold-600">💎</span> Material
                  </h4>
                  <div className="space-y-2">
                    {materials.map((mat) => (
                      <label key={mat.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="material-mobile"
                          value={mat.value}
                          checked={filters.material === mat.value}
                          onChange={(e) => handleFilterChange('material', e.target.value)}
                          className="h-4 w-4 text-gold-600 focus:ring-gold-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {mat.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-800 dark:text-white">
                    <span className="text-gold-600">📦</span> Availability
                  </h4>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      In Stock Only
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
                  <button
                    onClick={clearFilters}
                    className="w-full bg-gray-100 dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-dark-card text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-semibold transition text-sm mb-2"
                  >
                    Reset All Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 rounded-lg font-semibold transition text-sm"
                  >
                    Show {products.length} product{products.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== PRODUCTS GRID ========== */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div
              className={`grid ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              } gap-4 sm:gap-6`}
            >
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4 animate-pulse"
                >
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-4">🔍</div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white mb-2">
                No products found
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Try adjusting your filters or search terms
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 bg-gold-600 hover:bg-gold-700 text-white px-6 py-2 rounded-lg transition text-sm sm:text-base"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div
              className={`grid ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              } gap-4 sm:gap-6`}
            >
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;