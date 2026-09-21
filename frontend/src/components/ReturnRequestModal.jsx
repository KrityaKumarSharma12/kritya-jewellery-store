import React, { useState } from 'react';
import { X, Package, AlertCircle, Loader2, Check, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api/orders';

const REASONS = [
  { value: 'Damaged', label: 'Item arrived damaged' },
  { value: 'Wrong item', label: 'Received wrong item' },
  { value: 'Not as described', label: 'Not as described' },
  { value: 'Size issue', label: 'Size / fit issue' },
  { value: 'Changed mind', label: 'Changed my mind' },
  { value: 'Other', label: 'Other' },
];

const formatCurrency = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const ReturnRequestModal = ({ order, token, onClose, onSuccess }) => {
  // ⭐ FIX: use item.price (charged price) if present, else fall back to product.price
  const [selectedItems, setSelectedItems] = useState(() =>
    (order.items || []).reduce((acc, item) => {
      const chargedPrice =
        Number(item.price) ||
        Number(item.product?.price) ||
        0;
      acc[item.productId] = {
        selected: true,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        name: item.product?.name || 'Product',
        price: chargedPrice,
        image:
          item.product?.images?.[0] ||
          item.product?.colorMedia?.[0]?.url ||
          null,
      };
      return acc;
    }, {})
  );
  const [reason, setReason] = useState('Damaged');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // ⭐ NEW: server response after successful submit
  const [submitResult, setSubmitResult] = useState(null);

  const toggleItem = (productId) => {
    if (submitResult) return; // lock after submit
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], selected: !prev[productId].selected },
    }));
  };

  const updateQuantity = (productId, qty) => {
    if (submitResult) return;
    setSelectedItems((prev) => {
      const max = prev[productId].maxQuantity;
      const clamped = Math.max(1, Math.min(max, parseInt(qty, 10) || 1));
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: clamped },
      };
    });
  };

  const selectedList = Object.entries(selectedItems).filter(
    ([, v]) => v.selected
  );

  // Client-side preview — for reference only.
  // The authoritative refund comes from the server response after submit.
  const refundPreview = selectedList.reduce(
    (sum, [, v]) => sum + v.price * v.quantity,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedList.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    const items = selectedList.map(([productId, v]) => ({
      productId,
      quantity: v.quantity,
    }));

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API}/${order.id}/return`,
        { items, reason, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ⭐ Server response carries the authoritative refund amount
      const serverReturn = res.data?.return || res.data || {};
      setSubmitResult({
        refundAmount: Number(serverReturn.refundAmount) || refundPreview,
        status: serverReturn.status || 'PENDING',
        id: serverReturn.id,
      });

      toast.success('Return request submitted successfully');

      // Let the customer see the confirmed amount for a beat,
      // then refresh the list + close.
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1600);
    } catch (err) {
      console.error('Return request error:', err);
      const msg =
        err.response?.data?.message ||
        'Failed to submit return request';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const closeDisabled = submitting;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={closeDisabled ? undefined : onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border p-4 flex justify-between items-center z-10">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-playfair font-bold text-gray-800 dark:text-white">
              {submitResult ? 'Return Submitted' : 'Request Return'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
              Order #{order.id?.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={closeDisabled}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition disabled:opacity-50 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* ⭐ SUCCESS STATE — replaces the form once submitted */}
        {submitResult ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center py-4">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-800 dark:text-white font-semibold mb-1">
                Your return request is in
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We'll review it and get back to you within 2–3 business days.
              </p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-sm text-green-800 font-semibold">
                  Refund initiated
                </p>
                <p className="text-xs text-green-700">
                  Confirmed after inspection.
                </p>
              </div>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(submitResult.refundAmount)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess?.();
                onClose?.();
              }}
              className="w-full px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg"
            >
              Done
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select items to return
              </label>
              <div className="space-y-2">
                {Object.entries(selectedItems).map(([productId, item]) => {
                  const img = normalizeImageUrl(item.image);
                  return (
                    <div
                      key={productId}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                        item.selected
                          ? 'border-gold-500 bg-gold-50/50 dark:bg-gold-900/10'
                          : 'border-gray-200 dark:border-dark-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(productId)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                          item.selected
                            ? 'bg-gold-600 border-gold-600'
                            : 'border-gray-300 dark:border-dark-border'
                        }`}
                        aria-label={item.selected ? 'Deselect item' : 'Select item'}
                      >
                        {item.selected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>

                      {img ? (
                        <img
                          src={img}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.price)} · Max qty: {item.maxQuantity}
                        </p>
                      </div>

                      {item.selected && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(productId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 rounded border border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg flex items-center justify-center disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxQuantity}
                            className="w-7 h-7 rounded border border-gray-300 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg flex items-center justify-center disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for return *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Describe the issue, if any..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white resize-none"
              />
            </div>

            {/* ⭐ Refund preview — now clearly labeled as an estimate */}
            <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Estimated refund
                </span>
                <span className="text-xl font-bold text-gold-600">
                  {formatCurrency(refundPreview)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The final amount is calculated by our system after you submit
                and confirmed once the items are inspected.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedList.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReturnRequestModal;