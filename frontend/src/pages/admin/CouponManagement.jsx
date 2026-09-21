import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit, Trash2,  X, Tag,
  Calendar, Clock, Users, 
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Prisma Decimal → safe number
const toNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') return parseFloat(val) || 0;

  if (typeof val.toNumber === 'function') {
    try {
      const n = val.toNumber();
      if (Number.isFinite(n)) return n;
    } catch (_) {}
  }

  if (typeof val === 'object' && Array.isArray(val.d) && val.d.length > 0) {
    const sign = val.s ?? 1;
    if (val.d.length === 1) {
      return sign * Number(val.d[0]);
    }
    const BASE = 1e14;
    let mantissa = 0;
    for (let i = 0; i < val.d.length; i++) {
      mantissa += val.d[i] * Math.pow(BASE, val.d.length - 1 - i);
    }
    return sign * mantissa * Math.pow(10, val.e - (val.d.length - 1) * 14);
  }

  return 0;
};

const toNumberOrNull = (val) => {
  if (val === null || val === undefined || val === '') return null;
  return toNumber(val);
};

// Convert an ISO date string to "YYYY-MM-DD" for <input type="date">
const toDateInputValue = (val) => {
  if (!val) return '';
  try {
    return new Date(val).toISOString().split('T')[0];
  } catch (_) {
    return '';
  }
};

// Empty form state
const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  maxDiscount: '',
  minOrder: '',
  usageLimit: '',
  perUserLimit: '',
  startDate: '',
  endDate: '',
  isActive: true,
  isGlobal: true,
};

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState(emptyForm);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // ⭐ Build a payload with ONLY the fields the backend expects.
  // Never send id / createdAt / updatedAt / usedCount / usages.
  const buildPayload = () => ({
    code: formData.code.trim().toUpperCase(),
    description: formData.description || null,
    type: formData.type,
    value: formData.value === '' ? 0 : parseFloat(formData.value),
    maxDiscount:
      formData.maxDiscount === '' || formData.maxDiscount === null
        ? null
        : parseFloat(formData.maxDiscount),
    minOrder:
      formData.minOrder === '' || formData.minOrder === null
        ? null
        : parseFloat(formData.minOrder),
    usageLimit:
      formData.usageLimit === '' || formData.usageLimit === null
        ? null
        : parseInt(formData.usageLimit, 10),
    perUserLimit:
      formData.perUserLimit === '' || formData.perUserLimit === null
        ? null
        : parseInt(formData.perUserLimit, 10),
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    isActive: formData.isActive,
    isGlobal: formData.isGlobal,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = buildPayload();

    // Frontend-side validation
    if (!payload.code) {
      toast.error('Coupon code is required');
      return;
    }
    if (payload.value === 0 && formData.type !== 'FREE_SHIPPING') {
      // 0 is technically allowed but usually a mistake
      const ok = window.confirm('Discount value is 0. Continue?');
      if (!ok) return;
    }
    if (isNaN(payload.value)) {
      toast.error('Discount value must be a number');
      return;
    }

    try {
      const url = editingCoupon
        ? `http://localhost:5000/api/admin/coupons/${editingCoupon.id}`
        : 'http://localhost:5000/api/admin/coupons';

      await axios({
        method: editingCoupon ? 'put' : 'post',
        url,
        data: payload,
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(editingCoupon ? 'Coupon updated successfully' : 'Coupon created successfully');

      setShowModal(false);
      setEditingCoupon(null);
      setFormData(emptyForm);
      fetchCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      const msg = error.response?.data?.message || 'Failed to save coupon';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/coupons/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Coupon deleted');
        fetchCoupons();
      } catch (error) {
        console.error('Error deleting coupon:', error);
        toast.error(error.response?.data?.message || 'Failed to delete coupon');
      }
    }
  };

  const getStatusBadge = (coupon) => {
    const now = new Date();
    const start = coupon.startDate ? new Date(coupon.startDate) : null;
    const end = coupon.endDate ? new Date(coupon.endDate) : null;

    if (!coupon.isActive) return { color: 'bg-gray-100 text-gray-800', label: 'Inactive' };
    if (start && start > now) return { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' };
    if (end && end < now) return { color: 'bg-red-100 text-red-800', label: 'Expired' };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Used Up' };
    return { color: 'bg-green-100 text-green-800', label: 'Active' };
  };

  const CouponCard = ({ coupon }) => {
    const status = getStatusBadge(coupon);
    const usage = coupon.usageLimit
      ? `${coupon.usedCount}/${coupon.usageLimit}`
      : `${coupon.usedCount} used`;

    const value = toNumber(coupon.value);
    const minOrder = toNumberOrNull(coupon.minOrder);
    const maxDiscount = toNumberOrNull(coupon.maxDiscount);

    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition border-l-4 border-gold-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-gold-600 flex-shrink-0" />
              <h3 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-white truncate">
                {coupon.code}
              </h3>
            </div>
            {coupon.description && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                {coupon.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
              <span className="text-base sm:text-lg font-bold text-gold-600">
                {coupon.type === 'PERCENTAGE' && `${value}% OFF`}
                {coupon.type === 'FIXED' && `₹${value} OFF`}
                {coupon.type === 'FREE_SHIPPING' && 'Free Shipping'}
              </span>
              {minOrder !== null && minOrder > 0 && (
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                  Min: ₹{minOrder.toLocaleString('en-IN')}
                </span>
              )}
              {maxDiscount !== null && maxDiscount > 0 && (
                <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                  Max: ₹{maxDiscount.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
            <span className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${status.color}`}>
              {status.label}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingCoupon(coupon);
                  // ⭐ ONLY pick the fields the form needs. No spreading.
                  setFormData({
                    code: coupon.code || '',
                    description: coupon.description || '',
                    type: coupon.type || 'PERCENTAGE',
                    value: toNumber(coupon.value),
                    maxDiscount: toNumberOrNull(coupon.maxDiscount) ?? '',
                    minOrder: toNumberOrNull(coupon.minOrder) ?? '',
                    usageLimit: coupon.usageLimit ?? '',
                    perUserLimit: coupon.perUserLimit ?? '',
                    startDate: toDateInputValue(coupon.startDate),
                    endDate: toDateInputValue(coupon.endDate),
                    isActive: coupon.isActive !== false,
                    isGlobal: coupon.isGlobal === true,
                  });
                  setShowModal(true);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                aria-label="Edit coupon"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(coupon.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                aria-label="Delete coupon"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
            <Users className="h-4 w-4 flex-shrink-0" /> {usage}
          </div>
          {coupon.startDate && (
            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
              <Calendar className="h-4 w-4 flex-shrink-0" /> From {new Date(coupon.startDate).toLocaleDateString()}
            </div>
          )}
          {coupon.endDate && (
            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
              <Clock className="h-4 w-4 flex-shrink-0" /> Until {new Date(coupon.endDate).toLocaleDateString()}
            </div>
          )}
          {coupon.isGlobal && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded whitespace-nowrap">
              Global
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Coupons
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage discounts and promotions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setFormData(emptyForm);
            setShowModal(true);
          }}
          className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Create Coupon
        </button>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Tag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500">No coupons created yet</p>
          <button
            onClick={() => {
              setEditingCoupon(null);
              setFormData(emptyForm);
              setShowModal(true);
            }}
            className="mt-4 bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base"
          >
            Create Your First Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      )}

      {/* Add/Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    disabled={!!editingCoupon}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 uppercase disabled:bg-gray-100 dark:disabled:bg-dark-bg disabled:cursor-not-allowed text-sm sm:text-base"
                    placeholder="WELCOME10"
                  />
                  {editingCoupon && (
                    <p className="text-xs text-gray-500 mt-1">Coupon code cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                    placeholder={formData.type === 'PERCENTAGE' ? '10' : '500'}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maximum Discount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Order (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minOrder}
                    onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-start sm:items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isGlobal}
                    onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0 mt-0.5 sm:mt-0"
                  />
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    Global (applies to all products)
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  {editingCoupon ? 'Update' : 'Create'} Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement;