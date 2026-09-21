import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Heart, User, TrendingUp, Trash2, RefreshCw,
  Download, ChevronLeft, ChevronRight, Package,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api/admin';

const normalizeImg = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const WishlistManagement = () => {
  const [wishlists, setWishlists] = useState([]);
  const [stats, setStats] = useState({
    total: 0, uniqueUsers: 0, uniqueProducts: 0, topProducts: [],
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [deleting, setDeleting] = useState(null);
  const { token } = useAuth();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchWishlists = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/wishlists`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debounced || undefined, page, limit: 20 },
        });
        setWishlists(res.data.wishlists || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load wishlists');
      } finally {
        setLoading(false);
      }
    },
    [debounced, token]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/wishlists/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data || { total: 0, uniqueUsers: 0, uniqueProducts: 0, topProducts: [] });
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlists(1);
  }, [debounced]); // eslint-disable-line

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchWishlists(pagination.page);
    fetchStats();
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.productName}" from ${item.userName}'s wishlist?`)) return;
    try {
      setDeleting(item.id);
      await axios.delete(`${API}/wishlists/${item.id}`, authHeaders);
      toast.success('Removed from wishlist');
      fetchWishlists(pagination.page);
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove');
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/wishlists/export/csv`, {
        ...authHeaders,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `wishlists-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Wishlist Management
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Track what your customers are saving
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-gray-700 dark:text-gray-300 text-xs sm:text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={Heart}
          label="Total wishlist items"
          value={stats.total}
          color="text-gold-600"
        />
        <StatCard
          icon={User}
          label="Unique customers"
          value={stats.uniqueUsers}
          color="text-blue-600"
        />
        <StatCard
          icon={Package}
          label="Unique products"
          value={stats.uniqueProducts}
          color="text-green-600"
        />
      </div>

      {/* Top products */}
      {stats.topProducts?.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0" />
            Most Wishlisted Products
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {stats.topProducts.map((p) => {
              const img = normalizeImg(p.image);
              return (
                <div
                  key={p.productId}
                  className="text-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg"
                >
                  <div className="relative">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-20 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-semibold">
                      {p.count}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium mt-2 truncate">{p.name}</p>
                  <p className="text-xs text-gold-600 font-medium whitespace-nowrap">{fmt(p.price)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by product or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : wishlists.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Heart className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No wishlist items found</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {search
              ? 'Try a different search'
              : 'Wishlist items appear here when customers save products'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Product</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Category</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Price</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Customer</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Added</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wishlists.map((w) => {
                  const img = normalizeImg(w.productImage);
                  return (
                    <tr
                      key={w.id}
                      className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                    >
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {img ? (
                            <img
                              src={img}
                              alt={w.productName}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-bg flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">
                            {w.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">
                        {w.productCategory || '—'}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gold-600 text-right whitespace-nowrap">
                        {fmt(w.productPrice)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                        <p className="font-medium text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">
                          {w.userName}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[140px] sm:max-w-none">
                          {w.userEmail}
                        </p>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {new Date(w.addedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(w)}
                          disabled={deleting === w.id}
                          className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-40"
                          title="Remove from wishlist"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-3 sm:px-4 py-3 border-t border-gray-100 dark:border-dark-border">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Page {pagination.page} of {pagination.pages} · {pagination.total} items
              </p>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  onClick={() => fetchWishlists(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-bg"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchWishlists(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="p-2 border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-bg"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-3 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className={`text-lg sm:text-2xl font-bold mt-1 ${color} truncate`}>{value}</p>
      </div>
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-50 dark:bg-dark-bg flex items-center justify-center flex-shrink-0">
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
      </div>
    </div>
  </div>
);

export default WishlistManagement;