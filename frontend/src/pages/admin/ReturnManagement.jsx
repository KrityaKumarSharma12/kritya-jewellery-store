import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, X, RefreshCw, CheckCircle, XCircle,
  Clock, Package, DollarSign, AlertCircle,
  Loader2, ClipboardCheck, Coins,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/returns';

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

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return `http://localhost:5000${url}`;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const STATUS_CONFIG = {
  PENDING: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
    label: 'Pending',
  },
  APPROVED: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: CheckCircle,
    label: 'Approved',
  },
  REJECTED: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
    label: 'Rejected',
  },
  RECEIVED: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Package,
    label: 'Received',
  },
  INSPECTING: {
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: RefreshCw,
    label: 'Inspecting',
  },
  INSPECTED: {
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    icon: ClipboardCheck,
    label: 'Inspected',
  },
  REFUNDED: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: Coins,
    label: 'Refunded',
  },
  COMPLETED: {
    color: 'bg-green-600 text-white',
    icon: CheckCircle,
    label: 'Completed',
  },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ============================================================
// MAIN COMPONENT
// ============================================================
const ReturnManagement = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // ============== FETCH ==============
  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReturns(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Failed to load returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // ============== STATUS UPDATE ==============
  const handleStatusUpdate = async (returnId, status) => {
    try {
      setUpdatingId(returnId);
      await axios.put(
        `${API}/${returnId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Return marked as ${STATUS_CONFIG[status]?.label || status}`);
      await fetchReturns();
    } catch (err) {
      console.error('Error updating return status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenDetail = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowDetail(true);
  };

  // ============== BADGE ==============
  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    const Icon = config.icon;
    return (
      <span
        className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs rounded-full inline-flex items-center gap-1 whitespace-nowrap ${config.color}`}
      >
        <Icon className="h-3 w-3 flex-shrink-0" />
        {config.label}
      </span>
    );
  };

  // ============== FILTER ==============
  const filteredReturns = returns.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      r.id?.toLowerCase().includes(s) ||
      r.orderId?.toLowerCase().includes(s) ||
      r.customerName?.toLowerCase().includes(s) ||
      r.customerEmail?.toLowerCase().includes(s) ||
      r.reason?.toLowerCase().includes(s)
    );
  });

  // ============== RENDER ==============
  if (error) {
    return (
      <div className="text-center py-10 sm:py-12 px-4">
        <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4" />
        <p className="text-sm sm:text-base text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchReturns}
          className="bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
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
            Returns
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage return requests
          </p>
        </div>
        <button
          onClick={fetchReturns}
          disabled={loading}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm flex-shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by return ID, order ID, customer, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 -mx-1 px-1 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
            statusFilter === 'all'
              ? 'bg-gold-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-bg'
          }`}
        >
          All ({returns.length})
        </button>
        {ALL_STATUSES.map((status) => {
          const count = returns.filter((r) => r.status === status).length;
          if (count === 0 && statusFilter !== status) return null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
                statusFilter === status
                  ? 'bg-gold-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-bg'
              }`}
            >
              {STATUS_CONFIG[status].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Returns list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {returns.length === 0 ? 'No return requests yet' : 'No matching returns'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {returns.length === 0
              ? 'Return requests from customers will appear here'
              : 'Try adjusting your search or filter'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-4 text-gold-600 hover:text-gold-700 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredReturns.map((returnItem) => (
            <ReturnCard
              key={returnItem.id}
              returnItem={returnItem}
              StatusBadge={StatusBadge}
              onView={handleOpenDetail}
              onStatusChange={handleStatusUpdate}
              updating={updatingId === returnItem.id}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {showDetail && selectedReturn && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                  Return #{selectedReturn.id?.slice(-8)}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                  Order #{selectedReturn.orderId?.slice(-8)}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Status + amount */}
              <div className="flex flex-wrap justify-between items-center gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <StatusBadge status={selectedReturn.status} />
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Refund Amount</p>
                  <p className="text-lg sm:text-xl font-bold text-gold-600 whitespace-nowrap">
                    {formatCurrency(selectedReturn.refundAmount)}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Customer</p>
                <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                  {selectedReturn.customerName || 'Guest'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {selectedReturn.customerEmail}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {selectedReturn.customerPhone || 'No phone'}
                </p>
              </div>

              {/* Reason */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                <p className="text-xs sm:text-sm text-gray-800 dark:text-white whitespace-pre-line break-words">
                  {selectedReturn.reason || 'Not specified'}
                </p>
              </div>

              {/* Inspection result */}
              {selectedReturn.inspectionResult && (
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                    Inspection Result
                  </p>
                  <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 whitespace-pre-line break-words">
                    {selectedReturn.inspectionResult}
                  </p>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-semibold text-sm sm:text-base mb-3 text-gray-800 dark:text-white">
                  Returned Items ({selectedReturn.items?.length || 0})
                </h3>
                {!selectedReturn.items || selectedReturn.items.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No items listed
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedReturn.items.map((item) => {
                      const img = normalizeImageUrl(item.image);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-2 sm:gap-3"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            {img ? (
                              <img
                                src={img}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                Qty: {item.quantity} · {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          {item.isAccepted === true && (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          {item.isAccepted === false && (
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">
                  Timeline
                </p>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Requested</span>
                    <span className="text-gray-800 dark:text-white text-right truncate">
                      {formatDateTime(selectedReturn.createdAt)}
                    </span>
                  </div>
                  {selectedReturn.receivedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Received</span>
                      <span className="text-gray-800 dark:text-white text-right truncate">
                        {formatDateTime(selectedReturn.receivedAt)}
                      </span>
                    </div>
                  )}
                  {selectedReturn.inspectedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Inspected</span>
                      <span className="text-gray-800 dark:text-white text-right truncate">
                        {formatDateTime(selectedReturn.inspectedAt)}
                      </span>
                    </div>
                  )}
                  {selectedReturn.refundedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Refunded</span>
                      <span className="text-gray-800 dark:text-white text-right truncate">
                        {formatDateTime(selectedReturn.refundedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status change */}
              <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Status
                </label>
                <select
                  value={selectedReturn.status}
                  onChange={(e) => {
                    handleStatusUpdate(selectedReturn.id, e.target.value);
                    setSelectedReturn((prev) => ({ ...prev, status: e.target.value }));
                  }}
                  disabled={updatingId === selectedReturn.id}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 text-sm sm:text-base"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// RETURN CARD
// ============================================================
const ReturnCard = ({ returnItem, StatusBadge, onView, onStatusChange, updating }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
    <div className="flex flex-wrap justify-between items-start gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white whitespace-nowrap">
            #{returnItem.id?.slice(-8)}
          </p>
          <StatusBadge status={returnItem.status} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          Order: #{returnItem.orderId?.slice(-8)}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
          {returnItem.customerName || 'Guest'}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
          {returnItem.reason || 'No reason provided'}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base sm:text-lg font-bold text-gold-600 whitespace-nowrap">
          {formatCurrency(returnItem.refundAmount)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(returnItem.createdAt)}
        </p>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-dark-border">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <Package className="h-4 w-4 flex-shrink-0" /> {returnItem.items?.length || 0} items
        </div>
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <DollarSign className="h-4 w-4 flex-shrink-0" /> {returnItem.refundStatus || 'PENDING'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onView(returnItem)}
          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
          aria-label="View return"
          title="View return"
        >
          <Eye className="h-4 w-4" />
        </button>
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin text-gold-600" />
        ) : (
          <select
            value={returnItem.status}
            onChange={(e) => onStatusChange(returnItem.id, e.target.value)}
            className="text-xs sm:text-sm border border-gray-300 dark:border-dark-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white max-w-[110px] sm:max-w-none"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  </div>
);

export default ReturnManagement;