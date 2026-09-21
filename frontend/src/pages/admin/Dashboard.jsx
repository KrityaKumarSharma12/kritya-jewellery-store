import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COLORS = ['#D4AF37', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444'];

const Dashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        'http://localhost:5000/api/admin/dashboard/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleExport = () => {
    if (!stats) return;
    const { sales, orders, customers, products } = stats;
    const rows = [
      ['Metric', 'Value'],
      ['Total Sales', sales.total],
      ['Today Sales', sales.today],
      ['This Month Sales', sales.monthly],
      ['Last Month Sales', sales.lastMonth],
      ['Total Orders', orders.total],
      ['Pending Orders', orders.pending],
      ['Completed Orders', orders.completed],
      ['Cancelled Orders', orders.cancelled],
      ['Total Customers', customers.total],
      ['New Customers This Month', customers.newThisMonth],
      ['Total Products', products.total],
      ['Low Stock Products', products.lowStock],
      ['Out of Stock Products', products.outOfStock],
      ['Exported At', new Date().toISOString()],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kritya-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-10 w-10 text-gold-600 animate-spin" />
      </div>
    );
  }

  const {
    sales,
    orders,
    customers,
    products,
    salesTimeSeries = [],
    topProducts = [],
    recentOrders = [],
  } = stats;

  const changeIcon = (pct) =>
    pct >= 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );

  const changeColor = (pct) =>
    pct >= 0 ? 'text-green-600' : 'text-red-600';

  const statusColor = (status) => {
    const map = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Overview of your jewellery store
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={fetchStats}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Refresh
          </button>
          <button
            onClick={handleExport}
            className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <StatCard
          icon={DollarSign}
          iconBg="bg-gold-100 text-gold-600"
          label="Total Sales"
          value={`₹${sales.total.toLocaleString('en-IN')}`}
          change={sales.changePct}
          changeIcon={changeIcon}
          changeColor={changeColor}
          sub={`Today: ₹${sales.today.toLocaleString('en-IN')}`}
        />
        <StatCard
          icon={ShoppingBag}
          iconBg="bg-blue-100 text-blue-600"
          label="Total Orders"
          value={orders.total.toLocaleString('en-IN')}
          change={orders.changePct}
          changeIcon={changeIcon}
          changeColor={changeColor}
          sub={`Pending: ${orders.pending}`}
        />
        <StatCard
          icon={Users}
          iconBg="bg-purple-100 text-purple-600"
          label="Total Customers"
          value={customers.total.toLocaleString('en-IN')}
          change={customers.changePct}
          changeIcon={changeIcon}
          changeColor={changeColor}
          sub={`New this month: ${customers.newThisMonth}`}
        />
        <StatCard
          icon={Package}
          iconBg="bg-green-100 text-green-600"
          label="Total Products"
          value={products.total.toLocaleString('en-IN')}
          change={null}
          sub={`Low stock: ${products.lowStock}`}
        />
      </div>

      {/* Secondary Stat Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MiniStat
          icon={CheckCircle}
          label="Completed Orders"
          value={orders.completed}
          color="text-green-600"
        />
        <MiniStat
          icon={Clock}
          label="Pending Orders"
          value={orders.pending}
          color="text-yellow-600"
        />
        <MiniStat
          icon={XCircle}
          label="Out of Stock"
          value={products.outOfStock}
          color="text-red-600"
        />
        <MiniStat
          icon={AlertTriangle}
          label="Low Stock"
          value={products.lowStock}
          color="text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Line Chart — takes 2/3 */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              Sales Overview
            </h2>
            <div className="flex gap-1 text-xs sm:text-sm">
              {['7d', '30d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg transition ${
                    range === r
                      ? 'bg-gold-100 text-gold-700 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {r === '7d' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-[250px] sm:h-[280px] md:h-[300px]">
            <ResponsiveContainer>
              <LineChart
                data={
                  range === '7d'
                    ? salesTimeSeries.slice(-7)
                    : salesTimeSeries
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  }
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(v, name) =>
                    name === 'sales'
                      ? [`₹${v.toLocaleString('en-IN')}`, 'Sales']
                      : [v, 'Orders']
                  }
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                    })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Sales"
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products — takes 1/3 */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Top Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-xs sm:text-sm">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/api/placeholder/80/80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        #{i + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {p.totalQuantity} sold · ₹
                      {p.totalRevenue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders + Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
              Recent Orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-xs sm:text-sm text-gold-600 hover:text-gold-700 whitespace-nowrap flex-shrink-0"
            >
              View All
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-xs sm:text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-700 font-semibold text-xs sm:text-sm">
                      {o.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">
                      {o.customerName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {o.itemCount} item{o.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gold-600 text-xs sm:text-sm whitespace-nowrap">
                      ₹{o.total.toLocaleString('en-IN')}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap ${statusColor(
                        o.status
                      )}`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status Pie */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Order Status Breakdown
          </h2>
          <div className="w-full h-[220px] sm:h-[250px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: orders.completed },
                    { name: 'Pending', value: orders.pending },
                    { name: 'Cancelled', value: orders.cancelled },
                    {
                      name: 'Other',
                      value: Math.max(
                        0,
                        orders.total -
                          orders.completed -
                          orders.pending -
                          orders.cancelled
                      ),
                    },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={index} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== SUBCOMPONENTS ==============

const StatCard = ({
  icon: Icon,
  iconBg,
  label,
  value,
  change,
  changeIcon,
  changeColor,
  sub,
}) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-3 sm:p-4 md:p-5 hover:shadow-xl transition">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white mt-1 truncate">
          {value}
        </p>
        {change !== null && change !== undefined && (
          <p
            className={`text-xs mt-2 flex items-center gap-1 flex-wrap ${changeColor(
              change
            )}`}
          >
            {changeIcon(change)}
            {change >= 0 ? '+' : ''}
            {change}% <span className="text-gray-400">from last month</span>
          </p>
        )}
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
    </div>
  </div>
);

const MiniStat = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-dark-card rounded-xl shadow p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color} flex-shrink-0`} />
    <div className="min-w-0">
      <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
    </div>
  </div>
);

export default Dashboard;