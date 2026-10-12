import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE = 'http://localhost:5000/api/admin/dynamic-products';

const SizingRuleFormModal = ({
  dynamicProductId,
  rule,
  existingRules = [],
  components = [],
  token,
  onClose,
  onSaved,
}) => {
  const isEdit = !!rule;
  const uniqueKeys = Array.from(new Set(components.map((c) => c.componentKey)));

  const [form, setForm] = useState(
    isEdit
      ? {
          componentKey: rule.componentKey,
          sizeOption: rule.sizeOption,
          weightSurgeGrams: Number(rule.weightSurgeGrams) || 0,
          isDefault: !!rule.isDefault,
        }
      : {
          componentKey: uniqueKeys[0] || 'ring',
          sizeOption: '',
          weightSurgeGrams: 0,
          isDefault: false,
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.componentKey) return setError('Component key is required');
    if (!form.sizeOption.trim()) return setError('Size option is required');

    const payload = {
      componentKey: form.componentKey,
      sizeOption: form.sizeOption.trim(),
      weightSurgeGrams: Number(form.weightSurgeGrams) || 0,
      isDefault: !!form.isDefault,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.put(
          `${BASE}/${dynamicProductId}/sizing-rules/${rule.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Sizing rule updated');
      } else {
        await axios.post(
          `${BASE}/${dynamicProductId}/sizing-rules`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Sizing rule added');
      }
      onSaved?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save sizing rule';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 gap-2">
          <h2 className="text-lg sm:text-xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            {isEdit ? 'Edit Sizing Rule' : 'Add Sizing Rule'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Component Key *
            </label>
            <select
              value={form.componentKey}
              onChange={(e) => update('componentKey', e.target.value)}
              disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {uniqueKeys.length === 0 ? (
                <option value="ring">ring</option>
              ) : (
                uniqueKeys.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Size Option *
            </label>
            <input
              type="text"
              value={form.sizeOption}
              onChange={(e) => update('sizeOption', e.target.value)}
              placeholder="e.g. size_7 or 6.5_inch or finger_middle"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Must match how the PDP config emits it: <code className="font-mono">size_6</code>, <code className="font-mono">6.5_inch</code>, <code className="font-mono">finger_middle</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Weight Surge (grams)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.weightSurgeGrams}
              onChange={(e) => update('weightSurgeGrams', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Added to the component's base weight when this size is chosen
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sr-default"
              checked={form.isDefault}
              onChange={(e) => update('isDefault', e.target.checked)}
              className="h-4 w-4 text-gold-600 rounded"
            />
            <label htmlFor="sr-default" className="text-sm text-gray-700 dark:text-gray-300">
              Default for this component (auto-selected on PDP)
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SizingRuleFormModal;