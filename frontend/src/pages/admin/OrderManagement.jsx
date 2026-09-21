import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye, Download, Printer,
  Search, CheckCircle, XCircle,
  Clock, Truck, Package,
  DollarSign, RefreshCw, AlertCircle, X, Loader2,
} from 'lucide-react';

import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/orders';

// ============================================================
// HELPERS
// ============================================================
const formatCurrency = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return `http://localhost:5000${url}`;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const escapeCsvField = (value) => {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { token } = useAuth();

  // ============== FETCH ==============
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${API}?status=${filter}&page=${pagination.page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let ordersData = [];
      let paginationData = { page: 1, total: 0, pages: 0 };

      if (response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
          ordersData = response.data.orders;
          paginationData = response.data.pagination || paginationData;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
          paginationData = response.data.pagination || paginationData;
        }
      }

      setOrders(ordersData);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter, pagination.page, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ============== RESET TO PAGE 1 WHEN FILTER CHANGES ==============
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ============== STATUS UPDATE ==============
  const handleStatusUpdate = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      await axios.put(
        `${API}/${orderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Order marked as ${status}`);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ============== EXPORT CSV ==============
  const handleExport = async () => {
    try {
      setExporting(true);
      toast.loading('Preparing export...', { id: 'export' });

      const params = new URLSearchParams();
      params.append('status', filter);
      params.append('limit', '10000');
      params.append('page', '1');

      const response = await axios.get(`${API}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let allOrders = [];
      if (Array.isArray(response.data)) {
        allOrders = response.data;
      } else if (Array.isArray(response.data?.orders)) {
        allOrders = response.data.orders;
      } else if (Array.isArray(response.data?.data)) {
        allOrders = response.data.data;
      }

      if (allOrders.length === 0) {
        toast.error('No orders to export', { id: 'export' });
        return;
      }

      const filteredForExport = allOrders.filter((o) => {
        if (!searchTerm.trim()) return true;
        const s = searchTerm.toLowerCase();
        return (
          o.id?.toLowerCase().includes(s) ||
          o.customerName?.toLowerCase().includes(s) ||
          o.email?.toLowerCase().includes(s) ||
          o.phone?.toLowerCase().includes(s)
        );
      });

      const header = [
        'Order ID',
        'Date',
        'Customer',
        'Email',
        'Phone',
        'Items',
        'Total',
        'Payment Status',
        'Order Status',
        'Shipping Address',
      ];

      const rows = filteredForExport.map((o) => [
        o.id || '',
        o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '',
        o.customerName || 'Guest',
        o.email || '',
        o.phone || '',
        o.items?.length || 0,
        o.total ?? 0,
        o.paymentStatus || '',
        o.status || '',
        o.shippingAddress || '',
      ]);

      const csv = [
        header.map(escapeCsvField).join(','),
        ...rows.map((r) => r.map(escapeCsvField).join(',')),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredForExport.length} orders`, { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Export failed', { id: 'export' });
    } finally {
      setExporting(false);
    }
  };

  // ============== PRINT ==============
  const handlePrint = (order) => {
    if (!order) return;

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const itemRows = (order.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || 'Item'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.price || 0).toLocaleString('en-IN')}</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <html>
      <head>
        <title>Order #${order.id?.slice(-8) || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; padding: 10px 8px; background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
          .totals { margin-top: 20px; max-width: 280px; margin-left: auto; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .totals-row.total { border-top: 2px solid #333; padding-top: 10px; font-weight: bold; font-size: 16px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #eee; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Order #${order.id?.slice(-8) || ''}</h1>
        <p class="meta">
          Placed on ${order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'N/A'}
          · <span class="badge">${order.status || 'PENDING'}</span>
        </p>

        <h2>Customer</h2>
        <p>
          <strong>${order.customerName || 'Guest'}</strong><br/>
          ${order.email || ''}<br/>
          ${order.phone || ''}<br/>
          ${order.shippingAddress || ''}
        </p>

        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #999;">No items</td></tr>'}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="totals-row">
            <span>Shipping</span>
            <span>₹${Number(order.shippingCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="totals-row">
            <span>Tax (GST)</span>
            <span>₹${Number(order.tax || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="totals-row total">
            <span>Total</span>
            <span>₹${Number(order.total || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // ============== STATUS BADGE ==============
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      PROCESSING: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
      SHIPPED: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
      DELIVERED: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full inline-flex items-center gap-1 whitespace-nowrap ${badge.color}`}>
        <Icon className="h-3 w-3 flex-shrink-0" /> {status}
      </span>
    );
  };

  // ============== FILTERED ORDERS ==============
  const filteredOrders = orders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      o.id?.toLowerCase().includes(s) ||
      o.customerName?.toLowerCase().includes(s) ||
      o.email?.toLowerCase().includes(s) ||
      o.phone?.toLowerCase().includes(s)
    );
  });

  // ============== RENDER ==============
  if (error) {
    return (
      <div className="text-center py-10 sm:py-12 px-4">
        <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4" />
        <p className="text-sm sm:text-base text-red-500">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Orders
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage customer orders
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-xs sm:text-sm"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            Export
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order ID, customer, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 -mx-1 px-1 overflow-x-auto sm:overflow-x-visible">
        {['all', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
              filter === status
                ? 'bg-gold-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No orders match your search' : 'No orders found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusBadge={getStatusBadge}
              onView={() => {
                setSelectedOrder(order);
                setShowOrderDetail(true);
              }}
              onPrint={() => handlePrint(order)}
              onStatusChange={handleStatusUpdate}
              updating={updatingId === order.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPagination({ ...pagination, page: i + 1 })}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition text-xs sm:text-sm ${
                pagination.page === i + 1
                  ? 'bg-gold-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-bg'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setShowOrderDetail(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                Order #{selectedOrder.id?.slice(-8) || 'N/A'}
              </h2>
              <button
                onClick={() => setShowOrderDetail(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                    {selectedOrder.customerName || 'Guest'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">{selectedOrder.email}</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{selectedOrder.phone}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Shipping Address</p>
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-white break-words">
                    {selectedOrder.shippingAddress || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm sm:text-base mb-3 text-gray-800 dark:text-white">
                  Order Items
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => {
                    const img = normalizeImageUrl(item.image);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-2 sm:gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          {img ? (
                            <img
                              src={img}
                              alt={item.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/api/placeholder/50/50';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate">
                              {item.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-white whitespace-nowrap flex-shrink-0">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                <div className="space-y-2 max-w-sm ml-auto text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-800 dark:text-white whitespace-nowrap">
                      {formatCurrency(selectedOrder.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                    <span className="text-gray-800 dark:text-white whitespace-nowrap">
                      {formatCurrency(selectedOrder.shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Tax (GST)</span>
                    <span className="text-gray-800 dark:text-white whitespace-nowrap">
                      {formatCurrency(selectedOrder.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base font-bold border-t border-gray-200 dark:border-dark-border pt-2 gap-2">
                    <span className="text-gray-800 dark:text-white">Total</span>
                    <span className="text-gold-600 whitespace-nowrap">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 text-sm sm:text-base"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// ORDER CARD
// ============================================================
const OrderCard = ({ order, getStatusBadge, onView, onPrint, onStatusChange, updating }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
    <div className="flex flex-wrap justify-between items-start gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white whitespace-nowrap">
            #{order.id?.slice(-8) || 'N/A'}
          </p>
          {getStatusBadge(order.status)}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {order.customerName || 'Guest'}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{order.email || ''}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base sm:text-lg md:text-xl font-bold text-gold-600 whitespace-nowrap">
          {formatCurrency(order.total)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(order.createdAt)}</p>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-dark-border">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <Package className="h-4 w-4 flex-shrink-0" /> {order.items?.length || 0} items
        </div>
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <DollarSign className="h-4 w-4 flex-shrink-0" /> {order.paymentStatus || 'N/A'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onView}
          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          aria-label="View order"
          title="View order"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={onPrint}
          className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg rounded-lg transition"
          aria-label="Print order"
          title="Print order"
        >
          <Printer className="h-4 w-4" />
        </button>
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold-600" />
        ) : (
          <select
            value={order.status || 'PENDING'}
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            className="text-xs sm:text-sm border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white max-w-[110px] sm:max-w-none"
          >
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}
      </div>
    </div>
  </div>
);

export default OrderManagement;