import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ShoppingBag, Package, Download, RefreshCw, Calendar,
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin';

const CATEGORY_COLORS = [
  '#b48b3f', '#4f46e5', '#16a34a', '#dc2626', '#0891b2',
  '#db2777', '#7c3aed', '#ea580c', '#0d9488', '#be185d',
];

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const compact = (n) => {
  const num = Number(n || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
};

const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const Trend = ({ value }) => {
  if (value === 0 || value === null || value === undefined) {
    return <span className="text-xs text-gray-400">— no change</span>;
  }
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`text-xs font-medium flex items-center gap-1 flex-wrap ${up ? 'text-green-600' : 'text-red-600'}`}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      {up ? '+' : ''}{value}% <span className="text-gray-400">vs previous</span>
    </span>
  );
};

const ReportAnalytics = () => {
  const [salesReport, setSalesReport] = useState(null);
  const [productReport, setProductReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [productSort, setProductSort] = useState('revenue');
  const { token } = useAuth();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const buildParams = () => {
    const params = { period };
    if (showCustom && customFrom && customTo) {
      params.from = customFrom;
      params.to = customTo;
    }
    return params;
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);

      const [salesRes, productRes] = await Promise.all([
        axios.get(`${API}/reports/sales`, {
          headers: { Authorization: `Bearer ${token}` },
          params: (() => {
            const p = { period };
            if (showCustom && customFrom && customTo) {
              p.from = customFrom;
              p.to = customTo;
            }
            return p;
          })(),
        }),
        axios.get(`${API}/reports/products`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { sort: productSort, limit: 50 },
        }),
      ]);

      setSalesReport(salesRes.data);
      setProductReport(productRes.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [period, showCustom, customFrom, customTo, productSort, token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const params = buildParams();

      const [salesRes, productRes] = await Promise.all([
        axios.get(`${API}/reports/sales`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }),
        axios.get(`${API}/reports/products`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { sort: productSort, limit: 50 },
        }),
      ]);

      setSalesReport(salesRes.data);
      setProductReport(productRes.data || []);
      toast.success('Reports refreshed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/reports/export/csv`, {
        ...authHeaders,
        params: buildParams(),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${period}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report');
    }
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      toast.error('Pick both dates');
      return;
    }
    if (new Date(customFrom) > new Date(customTo)) {
      toast.error('From must be before To');
      return;
    }
    fetchReports();
  };

  if (loading && !salesReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  const s = salesReport?.summary || {};
  const timeSeries = salesReport?.timeSeries || [];
  const categories = salesReport?.categoryBreakdown || [];
  const totalCatRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Reports & Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            {salesReport?.range
              ? `${new Date(salesReport.range.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → ${new Date(salesReport.range.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'Business insights and performance metrics'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {!showCustom && (
            <div className="flex bg-white dark:bg-dark-card rounded-lg shadow overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm transition whitespace-nowrap ${
                    period === p.key
                      ? 'bg-gold-600 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className={`px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 border text-xs sm:text-sm ${
              showCustom
                ? 'bg-gold-50 border-gold-500 text-gold-700'
                : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            {showCustom ? 'Presets' : 'Custom Range'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-gray-700 dark:text-gray-300 disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExport}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden xs:inline">Export Report</span>
            <span className="xs:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Custom range picker */}
      {showCustom && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyCustomRange}
              className="flex-1 sm:flex-none px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition text-sm"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setShowCustom(false);
                setCustomFrom('');
                setCustomTo('');
              }}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <SummaryCard
          label="Total Revenue"
          value={fmt(s.totalRevenue)}
          Icon={DollarSign}
          color="text-gold-600"
          Trend={s.changeRevenue}
        />
        <SummaryCard
          label="Total Orders"
          value={s.totalOrders || 0}
          Icon={ShoppingBag}
          color="text-blue-600"
          Trend={s.changeOrders}
        />
        <SummaryCard
          label="Average Order Value"
          value={fmt(s.averageOrderValue)}
          Icon={TrendingUp}
          color="text-purple-600"
          Trend={s.changeAOV}
        />
        <SummaryCard
          label="Total Items Sold"
          value={s.totalItems || 0}
          Icon={Package}
          color="text-green-600"
          Trend={s.changeItems}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Overview — 2/3 width */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              Sales Overview
            </h3>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {timeSeries.length > 0 ? `Last ${timeSeries.length} data points` : 'No data'}
            </span>
          </div>
          <div className="h-56 sm:h-64 md:h-72">
            {timeSeries.length === 0 ? (
              <EmptyChart label="No orders in this range" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(v) => compact(v)}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value) => [fmt(value), 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b48b3f"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#b48b3f' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Distribution — 1/3 width */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Category Distribution
          </h3>
          <div className="h-56 sm:h-64 md:h-72">
            {categories.length === 0 ? (
              <EmptyChart label="No category data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="revenue"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categories.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none' }}
                    formatter={(value, name, props) => {
                      const pct = totalCatRevenue > 0
                        ? ((value / totalCatRevenue) * 100).toFixed(1)
                        : '0';
                      return [`${fmt(value)} (${pct}%)`, props.payload.category];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {categories.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {categories.slice(0, 6).map((c, i) => {
                const pct = totalCatRevenue > 0 ? ((c.revenue / totalCatRevenue) * 100).toFixed(0) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {c.category}
                    </span>
                    <span className="text-gray-500 flex-shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
            Top Products
          </h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-lg self-start sm:self-auto flex-shrink-0">
            <button
              onClick={() => setProductSort('revenue')}
              className={`px-3 py-1 text-xs rounded-md transition whitespace-nowrap ${
                productSort === 'revenue'
                  ? 'bg-white dark:bg-dark-card shadow font-medium'
                  : 'text-gray-500'
              }`}
            >
              By revenue
            </button>
            <button
              onClick={() => setProductSort('units')}
              className={`px-3 py-1 text-xs rounded-md transition whitespace-nowrap ${
                productSort === 'units'
                  ? 'bg-white dark:bg-dark-card shadow font-medium'
                  : 'text-gray-500'
              }`}
            >
              By units
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-dark-bg">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">#</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Product</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Category</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Sold</th>
                <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {productReport.slice(0, 10).map((product, index) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition">
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 whitespace-nowrap">{index + 1}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-dark-bg flex items-center justify-center flex-shrink-0">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 truncate max-w-[100px] sm:max-w-none">
                    {product.category || '—'}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {product.totalSold || 0}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-semibold text-xs sm:text-sm text-gold-600 whitespace-nowrap">
                    {fmt(product.revenue)}
                  </td>
                </tr>
              ))}
              {productReport.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                    No product data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, Icon, color, Trend: TrendValue }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
    <div className="flex items-center justify-between mb-2 gap-2">
      <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color} opacity-60 flex-shrink-0`} />
    </div>
    <p className={`text-lg sm:text-xl md:text-2xl font-bold ${color} truncate`}>{value}</p>
    <div className="mt-2">
      <Trend value={TrendValue} />
    </div>
  </div>
);

const EmptyChart = ({ label }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center px-4">
      <BarChart3 className="h-10 w-10 sm:h-14 sm:w-14 text-gray-300 mx-auto mb-2" />
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default ReportAnalytics;