import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ShoppingBag,  Send, Trash2, RefreshCw,
  Download, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api/admin';

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'reminded', label: 'Reminded' },
  { key: 'recovered', label: 'Recovered' },
  { key: 'all', label: 'All' },
];

const AbandonedCart = () => {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState({
    total: 0, active: 0, reminded: 0, recovered: 0,
    potentialRevenue: 0, recoveryRate: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('active');
  const [working, setWorking] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCarts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/abandoned-carts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            search: debounced || undefined,
            status: filter,
            page,
            limit: 20,
          },
        });
        setCarts(res.data.carts || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load abandoned carts');
      } finally {
        setLoading(false);
      }
    },
    [debounced, filter, token]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/abandoned-carts/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [token]);

  useEffect(() => { fetchCarts(1); }, [debounced, filter]); // eslint-disable-line
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const refresh = () => {
    fetchCarts(pagination.page);
    fetchStats();
  };

  const handleDetect = async () => {
    if (!window.confirm('Scan all active carts and mark idle ones as abandoned?')) return;
    try {
      setWorking('detect');
      const res = await axios.post(`${API}/abandoned-carts/detect`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Scan failed');
    } finally {
      setWorking(null);
    }
  };

  const handleRemind = async (cart) => {
    try {
      setWorking(cart.id);
      await axios.post(`${API}/abandoned-carts/${cart.id}/remind`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Reminder sent to ${cart.userName}`);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send reminder');
    } finally {
      setWorking(null);
    }
  };

  const handleRecover = async (cart) => {
    const target = !cart.recovered;
    if (!window.confirm(`${target ? 'Mark' : 'Unmark'} this cart as recovered?`)) return;
    try {
      setWorking(cart.id);
      await axios.post(
        `${API}/abandoned-carts/${cart.id}/recover`,
        { recovered: target },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(target ? 'Marked recovered' : 'Marked active');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update');
    } finally {
      setWorking(null);
    }
  };

  const handleDelete = async (cart) => {
    if (!window.confirm(`Delete abandoned cart for ${cart.userName}?`)) return;
    try {
      setWorking(cart.id);
      await axios.delete(`${API}/abandoned-carts/${cart.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Removed');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    } finally {
      setWorking(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/abandoned-carts/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: filter, search: debounced || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `abandoned-carts-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export');
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white">
            Abandoned Carts
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Recover lost sales
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDetect}
            disabled={working === 'detect'}
            className="px-3 sm:px-4 py-2 border border-gold-600 text-gold-700 dark:text-gold-400 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 transition flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${working === 'detect' ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Scan for abandoned</span>
            <span className="xs:hidden">Scan</span>
          </button>
          <button
            onClick={refresh}
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

      {/* Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Active carts"
          value={stats.active}
          color="text-gold-600"
        />
        <StatCard
          icon={Send}
          label="Reminded"
          value={stats.reminded}
          color="text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Recovered"
          value={`${stats.recovered}${stats.total ? ` · ${stats.recoveryRate}%` : ''}`}
          color="text-green-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Potential revenue"
          value={fmt(stats.potentialRevenue)}
          color="text-red-600"
        />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-lg overflow-x-auto flex-shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition whitespace-nowrap ${
                filter === f.key
                  ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : carts.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No abandoned carts found</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Click <strong>Scan for abandoned</strong> to check for new ones.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Customer</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Items</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Total</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Last Activity</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => (
                  <tr
                    key={cart.id}
                    className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                  >
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <p className="font-medium text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">{cart.userName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[140px] sm:max-w-none">{cart.userEmail}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {Array.isArray(cart.items) ? cart.items.length : 0} items
                      {Array.isArray(cart.items) && cart.items.length > 0 && (
                        <p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[160px]">
                          {cart.items.map((i) => i.name).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gold-600 text-right whitespace-nowrap">
                      {fmt(cart.total)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <p>{new Date(cart.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}</p>
                      <p className="text-xs text-gray-400">{timeAgo(cart.updatedAt)}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      {cart.recovered ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                          Recovered
                        </span>
                      ) : cart.reminderSent ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                          Reminded
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="inline-flex gap-0.5 sm:gap-1 justify-end w-full">
                        {!cart.recovered && (
                          <button
                            onClick={() => handleRemind(cart)}
                            disabled={working === cart.id}
                            className="p-1.5 sm:p-2 text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20 rounded-lg transition disabled:opacity-40"
                            title={cart.reminderSent ? 'Resend reminder' : 'Send reminder'}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRecover(cart)}
                          disabled={working === cart.id}
                          className={`p-1.5 sm:p-2 rounded-lg transition disabled:opacity-40 ${
                            cart.recovered
                              ? 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={cart.recovered ? 'Unmark recovered' : 'Mark recovered'}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cart)}
                          disabled={working === cart.id}
                          className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-3 sm:px-4 py-3 border-t border-gray-100 dark:border-dark-border">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Page {pagination.page} of {pagination.pages} · {pagination.total} carts
              </p>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  onClick={() => fetchCarts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-gray-300 dark:border-dark-border rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-bg"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchCarts(pagination.page + 1)}
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

export default AbandonedCart;