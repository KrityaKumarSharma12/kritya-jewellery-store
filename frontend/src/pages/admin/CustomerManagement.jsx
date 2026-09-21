import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, User, X,
  ShoppingBag, DollarSign, Calendar, Download, Loader2,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/customers';

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

const escapeCsvField = (value) => {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [exporting, setExporting] = useState(false);
  const { token } = useAuth();

  // ============== DEBOUNCE SEARCH ==============
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ============== FETCH LIST ==============
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await axios.get(`${API}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle multiple shapes
      let list = [];
      let pag = { page: 1, total: 0, pages: 0 };
      if (Array.isArray(response.data)) {
        list = response.data;
      } else if (Array.isArray(response.data?.customers)) {
        list = response.data.customers;
        pag = response.data.pagination || pag;
      } else if (Array.isArray(response.data?.data)) {
        list = response.data.data;
        pag = response.data.pagination || pag;
      }

      setCustomers(list);
      setPagination(pag);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ============== FETCH DETAIL (for the modal) ==============
  const fetchCustomerDetail = async (customerId) => {
    try {
      setLoadingDetail(true);
      const response = await axios.get(`${API}/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedCustomer(response.data);
      setShowCustomerDetail(true);
    } catch (error) {
      console.error('Error fetching customer detail:', error);
      // Fall back to whatever we already have in state
      toast.error('Could not load full customer details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ============== EXPORT CSV ==============
  const handleExport = async () => {
    try {
      setExporting(true);
      toast.loading('Preparing export...', { id: 'export' });

      // Fetch all customers (no pagination) matching the current search
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '10000');
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await axios.get(`${API}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let allCustomers = [];
      if (Array.isArray(response.data)) {
        allCustomers = response.data;
      } else if (Array.isArray(response.data?.customers)) {
        allCustomers = response.data.customers;
      } else if (Array.isArray(response.data?.data)) {
        allCustomers = response.data.data;
      }

      if (allCustomers.length === 0) {
        toast.error('No customers to export', { id: 'export' });
        return;
      }

      const header = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Address',
        'Orders',
        'Total Spent',
        'Joined',
      ];

      const rows = allCustomers.map((c) => [
        c.id || '',
        c.name || 'Guest',
        c.email || '',
        c.phone || '',
        c.address || '',
        c._count?.orders || 0,
        Number(c.totalSpent) || 0,
        c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
      ]);

      const csv = [
        header.map(escapeCsvField).join(','),
        ...rows.map((r) => r.map(escapeCsvField).join(',')),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${allCustomers.length} customers`, { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.message || 'Export failed', { id: 'export' });
    } finally {
      setExporting(false);
    }
  };

  // ============== OPEN DETAIL ==============
  const openCustomerDetail = (customer) => {
    // Set summary immediately so the modal isn't blank
    setSelectedCustomer(customer);
    setShowCustomerDetail(true);
    // Then fetch the full detail (including orders)
    fetchCustomerDetail(customer.id);
  };

  // ============== RENDER ==============
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Customers
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage your customer base
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-xs sm:text-sm flex-shrink-0"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Customers
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <User className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {debouncedSearch
              ? 'No customers match your search'
              : 'No customers found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onView={() => openCustomerDetail(customer)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mr-1 sm:mr-2 whitespace-nowrap">
            Page {pagination.page} of {pagination.pages}
          </span>
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
        </div>
      )}

      {/* Customer Detail Modal */}
      {showCustomerDetail && selectedCustomer && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setShowCustomerDetail(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                Customer Details
              </h2>
              <button
                onClick={() => setShowCustomerDetail(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {/* Profile */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl sm:text-2xl">
                    {selectedCustomer.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white truncate">
                    {selectedCustomer.name || 'Guest'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {selectedCustomer.email}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {selectedCustomer.phone || 'No phone'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gold-600">
                    {selectedCustomer.orders?.length ?? selectedCustomer._count?.orders ?? 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Total Orders
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gold-600 whitespace-nowrap">
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Total Spent
                  </p>
                </div>
              </div>

              {/* Address */}
              {selectedCustomer.address && (
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Address</p>
                  <p className="font-medium text-sm sm:text-base text-gray-800 dark:text-white break-words">
                    {selectedCustomer.address}
                  </p>
                </div>
              )}

              {/* Recent Orders */}
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base text-gray-800 dark:text-white">
                  Recent Orders
                </h4>

                {loadingDetail ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gold-600" />
                  </div>
                ) : !selectedCustomer.orders || selectedCustomer.orders.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                    No orders yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate">
                            #{order.id?.slice(-8)}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-xs sm:text-sm text-gold-600 whitespace-nowrap">
                            {formatCurrency(order.total)}
                          </p>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${
                              order.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : order.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : order.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// CUSTOMER CARD
// ============================================================
const CustomerCard = ({ customer, onView }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-lg sm:text-xl">
          {customer.name?.charAt(0).toUpperCase() || 'U'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
              {customer.name || 'Guest'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {customer.email}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {customer.phone || 'No phone'}
            </p>
          </div>
          <button
            onClick={onView}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition flex-shrink-0"
            aria-label="View customer"
            title="View customer"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <ShoppingBag className="h-4 w-4 flex-shrink-0" />
            {customer._count?.orders || 0} orders
          </div>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            {formatCurrency(customer.totalSpent)}
          </div>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            Joined {formatDate(customer.createdAt)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CustomerManagement;