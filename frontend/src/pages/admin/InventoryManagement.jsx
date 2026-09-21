import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Package, AlertCircle,
  CheckCircle, XCircle, Edit,
  RefreshCw, Download, X, Plus, Minus, Loader2,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin';

// ============================================================
// HELPERS
// ============================================================
const normalizeImageUrl = (url) => {
  if (!url) return null;
  // Fix relative paths → absolute backend URL
  if (url.startsWith('/uploads/')) return `http://localhost:5000${url}`;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const formatCurrency = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  const [adjustForm, setAdjustForm] = useState({
    type: 'ADD',       // 'ADD' | 'REMOVE'
    quantity: '',
    reason: 'Restock',
    notes: '',
  });

  // ============== FETCH ==============
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ============== STATUS BADGE ==============
  const getStatusBadge = (status) => {
    const badges = {
      IN_STOCK: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
        label: 'In Stock',
      },
      LOW_STOCK: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: AlertCircle,
        label: 'Low Stock',
      },
      OUT_OF_STOCK: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
        label: 'Out of Stock',
      },
      DISCONTINUED: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        icon: XCircle,
        label: 'Discontinued',
      },
    };
    return badges[status] || badges.IN_STOCK;
  };

  // ============== ADJUST MODAL ==============
  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({
      type: 'ADD',
      quantity: '',
      reason: 'Restock',
      notes: '',
    });
    setShowAdjustModal(true);
  };

  const closeAdjustModal = () => {
    if (saving) return;
    setShowAdjustModal(false);
    setSelectedItem(null);
  };

  const previewNewStock = () => {
    if (!selectedItem) return selectedItem?.stock ?? 0;
    const qty = parseInt(adjustForm.quantity, 10) || 0;
    return adjustForm.type === 'ADD'
      ? selectedItem.stock + qty
      : selectedItem.stock - qty;
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseInt(adjustForm.quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const newStock = previewNewStock();
    if (newStock < 0) {
      toast.error('Cannot remove more than current stock');
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${API}/inventory/adjust`,
        {
          productId: selectedItem.id,
          quantity: qty,
          type: adjustForm.type,
          reason: adjustForm.reason,
          notes: adjustForm.notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Stock ${adjustForm.type === 'ADD' ? 'increased' : 'decreased'} successfully`);
      closeAdjustModal();
      await fetchInventory();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error(
        error.response?.data?.message || 'Failed to adjust inventory'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============== EXPORT CSV ==============
  const handleExport = () => {
    if (filteredInventory.length === 0) {
      toast.error('Nothing to export');
      return;
    }

    const rows = [
      ['Product', 'SKU', 'Category', 'Stock', 'Price', 'Status'],
      ...filteredInventory.map((item) => [
        item.name || '',
        item.sku || '',
        item.category || '',
        item.stock ?? 0,
        item.price ?? 0,
        item.status || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory exported');
  };

  // ============== FILTER ==============
  const filteredInventory = inventory.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(s) ||
      item.sku?.toLowerCase().includes(s) ||
      item.category?.toLowerCase().includes(s)
    );
  });

  // ============== STOCK COLOR ==============
  const stockColor = (stock) => {
    if (stock === 0) return 'text-red-600 dark:text-red-400';
    if (stock < 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // ============== RENDER ==============
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Inventory
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage your stock and inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base w-full sm:w-auto"
        >
          <option value="all">All Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Inventory */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {searchTerm || filter !== 'all'
              ? 'No inventory items match your filter'
              : 'No inventory items found'}
          </p>
        </div>
      ) : (
        <>
          {/* ============ DESKTOP TABLE ============ */}
          <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-bg">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Product
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      SKU
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Category
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Stock
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {filteredInventory.map((item) => {
                    const status = getStatusBadge(item.status);
                    const Icon = status.icon;
                    const img = normalizeImageUrl(item.images?.[0]);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                      >
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img
                                src={img}
                                alt={item.name || 'Product'}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/api/placeholder/40/40';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 dark:text-white truncate">
                                {item.name || 'Unnamed product'}
                              </p>
                              {item.price > 0 && (
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(item.price)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                          {item.sku || '—'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {item.category || '—'}
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`font-semibold ${stockColor(item.stock)}`}>
                            {item.stock ?? 0}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span
                            className={`px-3 py-1 text-xs rounded-full inline-flex items-center gap-1 whitespace-nowrap ${status.color}`}
                          >
                            <Icon className="h-3 w-3 flex-shrink-0" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Edit className="h-4 w-4 flex-shrink-0" />
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============ MOBILE CARDS ============ */}
          <div className="md:hidden space-y-3">
            {filteredInventory.map((item) => {
              const status = getStatusBadge(item.status);
              const Icon = status.icon;
              const img = normalizeImageUrl(item.images?.[0]);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-dark-card rounded-xl shadow-md p-3 sm:p-4 border border-gray-100 dark:border-dark-border"
                >
                  <div className="flex gap-2 sm:gap-3 mb-3">
                    {img ? (
                      <img
                        src={img}
                        alt={item.name || 'Product'}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/api/placeholder/56/56';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">
                        {item.name || 'Unnamed product'}
                      </p>
                      <p className="text-xs font-mono text-gray-500 truncate">
                        {item.sku || 'no-sku'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{item.category || '—'}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-[10px] rounded-full inline-flex items-center gap-1 whitespace-nowrap self-start flex-shrink-0 ${status.color}`}
                    >
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-border gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className={`text-base sm:text-lg font-bold ${stockColor(item.stock)}`}>
                        {item.stock ?? 0}
                      </p>
                    </div>
                    <button
                      onClick={() => openAdjustModal(item)}
                      className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                    >
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Adjust
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============== ADJUST MODAL ============== */}
      {showAdjustModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={closeAdjustModal}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-start mb-4 gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-playfair font-bold text-gray-800 dark:text-white">
                  Adjust Stock
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {selectedItem.name}
                </p>
                <p className="text-xs font-mono text-gray-400 truncate">
                  {selectedItem.sku || 'no-sku'}
                </p>
              </div>
              <button
                onClick={closeAdjustModal}
                disabled={saving}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg disabled:opacity-50 flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Current stock */}
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Current stock</p>
              <p className={`text-xl sm:text-2xl font-bold ${stockColor(selectedItem.stock)}`}>
                {selectedItem.stock ?? 0}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adjustment type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'ADD' })}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition text-xs sm:text-sm ${
                      adjustForm.type === 'ADD'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'REMOVE' })}
                    className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition text-xs sm:text-sm ${
                      adjustForm.type === 'REMOVE'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Minus className="h-4 w-4 flex-shrink-0" />
                    Remove
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  required
                  placeholder="Enter quantity"
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                >
                  <option value="Restock">Restock</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Return">Return</option>
                  <option value="Correction">Inventory Correction</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white resize-none text-sm sm:text-base"
                />
              </div>

              {/* Preview */}
              {adjustForm.quantity && parseInt(adjustForm.quantity, 10) > 0 && (
                <div
                  className={`p-3 rounded-lg border-2 ${
                    previewNewStock() < 0
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                      : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-gray-600 dark:text-gray-400">New stock will be</span>
                    <span
                      className={`text-lg sm:text-xl font-bold whitespace-nowrap ${
                        previewNewStock() < 0 ? 'text-red-600' : stockColor(previewNewStock())
                      }`}
                    >
                      {previewNewStock()}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  type="button"
                  onClick={closeAdjustModal}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || previewNewStock() < 0}
                  className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;