import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Edit,
  Save, X, Check, History, Loader2,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/metal-rates';

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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getLabel = (rate) => {
  if (!rate) return '—';
  if (rate.metal === 'GOLD') return `${rate.karat}K Gold`;
  return rate.metal.charAt(0) + rate.metal.slice(1).toLowerCase();
};

const MetalRateManagement = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id, newRate }
  const [updating, setUpdating] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const { token } = useAuth();

  // ============== FETCH ==============
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to load metal rates');
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    }
  }, [token]);

  useEffect(() => {
    fetchRates();
    fetchHistory();
  }, [fetchRates, fetchHistory]);

  // ============== UPDATE SINGLE ==============
  const handleUpdateRate = async () => {
    if (!editing) return;
    const newRate = parseFloat(editing.newRate);
    if (!Number.isFinite(newRate) || newRate <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    try {
      setUpdating(true);
      await axios.put(
        `${API}/${editing.id}`,
        { ratePerGram: newRate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Rate updated');
      setEditing(null);
      await fetchRates();
      await fetchHistory();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error(error.response?.data?.message || 'Failed to update rate');
    } finally {
      setUpdating(false);
    }
  };

  // ============== BULK UPDATE ==============
  const editedRates = rates.filter(
    (r) => r._editedRate != null && Number(r._editedRate) !== Number(r.ratePerGram)
  );

  const handleBulkUpdate = async () => {
    if (editedRates.length === 0) {
      toast.error('No changes to save');
      return;
    }
    try {
      setUpdating(true);
      const payload = {
        rates: editedRates.map((r) => ({
          id: r.id,
          ratePerGram: parseFloat(r._editedRate),
        })),
      };
      await axios.post(`${API}/bulk-update`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        `Updated ${editedRates.length} rate${editedRates.length > 1 ? 's' : ''}`
      );
      setRates((prev) => prev.map((r) => ({ ...r, _editedRate: undefined })));
      await fetchRates();
      await fetchHistory();
    } catch (error) {
      console.error('Error bulk updating rates:', error);
      toast.error(error.response?.data?.message || 'Failed to update rates');
    } finally {
      setUpdating(false);
    }
  };

  

  const hasUnsavedChanges = editedRates.length > 0;

  // ============== TREND INDICATOR ==============
  const getTrend = (rate) => {
    const relevant = history.find(
      (h) =>
        h.metal === rate.metal &&
        (h.karat ?? null) === (rate.karat ?? null)
    );
    if (!relevant) return null;
    if (rate.ratePerGram > relevant.oldRate) return 'up';
    if (rate.ratePerGram < relevant.oldRate) return 'down';
    return null;
  };

  // ============== LIVE PREVIEW ==============
  const gold24 = rates.find((r) => r.metal === 'GOLD' && r.karat === 24);
  const gold22 = rates.find((r) => r.metal === 'GOLD' && r.karat === 22);
  const gold18 = rates.find((r) => r.metal === 'GOLD' && r.karat === 18);
  const gold14 = rates.find((r) => r.metal === 'GOLD' && r.karat === 14);
  const silver = rates.find((r) => r.metal === 'SILVER');
  const platinum = rates.find((r) => r.metal === 'PLATINUM');

  const previewRows = [
    gold24 && {
      label: '24KT Gold Rate',
      value: gold24.ratePerGram,
    },
    gold22 && {
      label: `22KT Gold Rate (22/24 × ${gold24?.ratePerGram || 0})`,
      value: gold24 ? Math.round((22 / 24) * gold24.ratePerGram) : gold22.ratePerGram,
    },
    gold18 && {
      label: `18KT Gold Rate (18/24 × ${gold24?.ratePerGram || 0})`,
      value: gold24 ? Math.round((18 / 24) * gold24.ratePerGram) : gold18.ratePerGram,
    },
    gold14 && {
      label: `14KT Gold Rate (14/24 × ${gold24?.ratePerGram || 0})`,
      value: gold24 ? Math.round((14 / 24) * gold24.ratePerGram) : gold14.ratePerGram,
    },
    silver && { label: 'Silver Rate', value: silver.ratePerGram },
    platinum && { label: 'Platinum Rate', value: platinum.ratePerGram },
  ].filter(Boolean);

  // ============== RENDER ==============
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Metal Rates
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage gold, silver, and platinum rates
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={fetchRates}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg text-gray-700 dark:text-gray-200 rounded-lg transition flex items-center gap-2 text-xs sm:text-sm"
          >
            <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            History
          </button>
          <button
            onClick={handleBulkUpdate}
            disabled={updating || !hasUnsavedChanges}
            className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 text-xs sm:text-sm"
          >
            {updating ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            Update All
            {hasUnsavedChanges && (
              <span className="bg-white/20 text-xs rounded-full px-2 py-0.5 font-semibold">
                {editedRates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Rates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-gold-600" />
        </div>
      ) : rates.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No metal rates configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {rates.map((rate) => {
            const isEditing = editing?.id === rate.id;
            const trend = getTrend(rate);
            const pendingValue = rate._editedRate;

            return (
              <div
                key={rate.id}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-5 relative"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                      {getLabel(rate)}
                    </p>

                    {/* Rate value */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xl font-bold text-gold-600">₹</span>
                        <input
                          type="number"
                          autoFocus
                          value={editing.newRate}
                          onChange={(e) =>
                            setEditing({ ...editing, newRate: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateRate();
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          className="w-full min-w-0 text-xl font-bold text-gold-600 bg-transparent border-b-2 border-gold-600 focus:outline-none"
                        />
                        <span className="text-sm text-gray-500">/g</span>
                      </div>
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold text-gold-600 mt-1">
                        {formatCurrency(rate.ratePerGram)}
                        <span className="text-xs sm:text-sm font-normal text-gray-500 ml-0.5">/g</span>
                      </p>
                    )}

                    {/* Purity — rounded */}
                    {rate.purity != null && (
                      <p className="text-xs text-gray-400 mt-1">
                        Purity: {Number(rate.purity).toFixed(2)}%
                      </p>
                    )}

                    <p className="text-xs text-gray-400 truncate">
                      Last updated: {formatDate(rate.updatedAt)}
                    </p>
                  </div>

                  {/* Edit/Save buttons */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={handleUpdateRate}
                          disabled={updating}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition disabled:opacity-50"
                          title="Save"
                          aria-label="Save rate"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setEditing({
                            id: rate.id,
                            newRate: String(rate.ratePerGram),
                          })
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        title="Edit"
                        aria-label="Edit rate"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}

                    {/* Trend arrow */}
                    {trend && (
                      <div className="flex justify-center">
                        {trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending change indicator (when Update All is queued) */}
                {pendingValue != null &&
                  Number(pendingValue) !== Number(rate.ratePerGram) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border text-xs text-gray-500 dark:text-gray-400">
                      Pending:{' '}
                      <span className="font-semibold text-gold-600">
                        {formatCurrency(pendingValue)}
                      </span>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Price Calculation Preview — LIVE */}
      {!loading && previewRows.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Price Calculation Preview
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {previewRows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg"
              >
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate min-w-0">
                  {row.label}
                </span>
                <span className="font-bold text-sm sm:text-base text-gray-800 dark:text-white whitespace-nowrap flex-shrink-0">
                  {formatCurrency(row.value)}
                  <span className="text-sm font-normal text-gray-500">/g</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate History */}
      {showHistory && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
              Rate History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 flex-shrink-0"
              aria-label="Close history"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No rate changes recorded yet
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Metal
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Old Rate
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        New Rate
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Changed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {history.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 dark:hover:bg-dark-bg transition"
                      >
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-800 dark:text-white whitespace-nowrap">
                          {entry.karat ? `${entry.karat}K ` : ''}
                          {entry.metal}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                          {formatCurrency(entry.oldRate)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-green-600 dark:text-green-400 whitespace-nowrap">
                          {formatCurrency(entry.newRate)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate max-w-[140px]">
                          {entry.changedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-100 dark:border-dark-border"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {entry.karat ? `${entry.karat}K ` : ''}
                        {entry.metal}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                      <span className="text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatCurrency(entry.oldRate)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 dark:text-green-400 whitespace-nowrap">
                        {formatCurrency(entry.newRate)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      by {entry.changedBy}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MetalRateManagement;