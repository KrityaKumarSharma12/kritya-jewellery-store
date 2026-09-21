import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  DollarSign,
  CreditCard,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// ✅ Bulletproof currency formatter — handles number, string, Decimal object
const formatCurrency = (val) => {
  if (val == null) return '₹0.00';

  // Handle Prisma Decimal { s, e, d } shape just in case
  if (typeof val === 'object' && Array.isArray(val.d)) {
    const n = Number(val.toString?.() ?? 0);
    if (Number.isFinite(n)) {
      return `₹${n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0.00';

  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { token } = useAuth();

  // ✅ Wrapped in useCallback — stable reference, satisfies exhaustive-deps
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/admin/payments',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: {
        color:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
      },
      PAID: {
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
      },
      FAILED: {
        color:
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
      },
      REFUNDED: {
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: RefreshCw,
      },
      PARTIALLY_REFUNDED: {
        color:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        icon: RefreshCw,
      },
    };
    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span
        className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${badge.color}`}
      >
        <Icon className="h-3 w-3 flex-shrink-0" /> {status}
      </span>
    );
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'CARD':
        return <CreditCard className="h-4 w-4" />;
      case 'UPI':
        return <Wallet className="h-4 w-4" />;
      case 'COD':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      p.transactionId?.toLowerCase().includes(s) ||
      p.orderId?.toLowerCase().includes(s) ||
      p.order?.user?.name?.toLowerCase().includes(s) ||
      p.user?.name?.toLowerCase().includes(s) ||
      p.method?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Payments
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage customer payments
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No payments found</p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: full table */}
          <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 dark:bg-dark-bg">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Transaction
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Order
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Customer
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Method
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                    >
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs font-mono text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                        {payment.transactionId || 'N/A'}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        #{payment.orderId?.slice(-8)}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200 truncate max-w-[140px]">
                        {payment.order?.user?.name ||
                          payment.user?.name ||
                          'Guest'}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                          {getMethodIcon(payment.method)}
                          <span className="text-xs sm:text-sm whitespace-nowrap">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 font-semibold text-xs sm:text-sm text-gold-600 whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white dark:bg-dark-card rounded-xl shadow-md p-3 sm:p-4 border border-gray-100 dark:border-dark-border"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                      {payment.transactionId || 'N/A'}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">
                      #{payment.orderId?.slice(-8)}
                    </p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    Customer
                  </span>
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 truncate">
                    {payment.order?.user?.name ||
                      payment.user?.name ||
                      'Guest'}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    Method
                  </span>
                  <div className="flex items-center gap-1 text-gray-800 dark:text-gray-200">
                    {getMethodIcon(payment.method)}
                    <span className="text-xs sm:text-sm whitespace-nowrap">{payment.method}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    Date
                  </span>
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-dark-border gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
                    Amount
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gold-600 whitespace-nowrap">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentManagement;