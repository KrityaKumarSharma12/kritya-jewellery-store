import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE = 'http://localhost:5000/api/admin/dynamic-products';

const COMPONENT_KEYS = ['ring', 'bridge', 'medallion', 'bracelet'];
const MAKING_CHARGE_TYPES = ['PER_GRAM', 'FLAT', 'PERCENTAGE'];
const PRICE_BASIS = ['PER_GRAM', 'PER_CM', 'FLAT'];
const PURITIES = ['9K', '14K', '18K', '22K', '24K'];
const METAL_TYPES = ['GOLD', 'SILVER', 'PLATINUM'];

const EMPTY = {
  componentKey: 'ring',
  styleKey: 'classic',
  name: '',
  zone: '',
  isRepeatable: false,
  maxQuantity: 1,
  isOptional: false,
  priceBasis: 'PER_GRAM',
  metalType: 'GOLD',
  purity: '22K',
  availablePurities: ['9K', '14K', '18K', '22K'],
  baseWeightGrams: 0,
  wastagePercentage: 2.5,
  makingChargeType: 'PER_GRAM',
  makingChargeValue: 0,
  gemstones: [],
  stoneWeightGrams: 0,
  displayOrder: 0,
};

const ComponentFormModal = ({
  dynamicProductId,
  component,
  existingComponents = [],
  token,
  onClose,
  onSaved,
}) => {
  const isEdit = !!component;
  const [form, setForm] = useState(isEdit
    ? {
        componentKey: component.componentKey,
        styleKey: component.styleKey || 'classic',
        name: component.name || '',
        zone: component.zone || '',
        isRepeatable: !!component.isRepeatable,
        maxQuantity: component.maxQuantity ?? 1,
        isOptional: !!component.isOptional,
        priceBasis: component.priceBasis || 'PER_GRAM',
        metalType: component.metalType || 'GOLD',
        purity: component.purity || '22K',
        availablePurities: component.availablePurities || ['9K', '14K', '18K', '22K'],
        baseWeightGrams: Number(component.baseWeightGrams) || 0,
        wastagePercentage: Number(component.wastagePercentage) || 0,
        makingChargeType: component.makingChargeType || 'PER_GRAM',
        makingChargeValue: Number(component.makingChargeValue) || 0,
        gemstones: component.gemstones || [],
        stoneWeightGrams: Number(component.stoneWeightGrams) || 0,
        displayOrder: component.displayOrder ?? 0,
      }
    : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const togglePurity = (p) => {
    setForm((prev) => {
      const has = prev.availablePurities.includes(p);
      return {
        ...prev,
        availablePurities: has
          ? prev.availablePurities.filter((x) => x !== p)
          : [...prev.availablePurities, p].sort(
              (a, b) => PURITIES.indexOf(a) - PURITIES.indexOf(b)
            ),
      };
    });
  };

  // ------- Gemstone helpers -------
  const addGemstone = () =>
    update('gemstones', [
      ...form.gemstones,
      { name: '', type: '', zone: '', carats: 0, ratePerCarat: 0, settingCharge: 0, count: 1, isCluster: false },
    ]);
  const updateGemstone = (idx, patch) =>
    update(
      'gemstones',
      form.gemstones.map((g, i) => (i === idx ? { ...g, ...patch } : g))
    );
  const removeGemstone = (idx) =>
    update('gemstones', form.gemstones.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required');
    if (!form.componentKey) return setError('Component key is required');
    if (form.baseWeightGrams <= 0) return setError('Base weight must be > 0');

    const payload = {
      ...form,
      baseWeightGrams: Number(form.baseWeightGrams),
      wastagePercentage: Number(form.wastagePercentage),
      makingChargeValue: Number(form.makingChargeValue),
      stoneWeightGrams: Number(form.stoneWeightGrams),
      maxQuantity: Number(form.maxQuantity),
      displayOrder: Number(form.displayOrder),
    };

    try {
      setSaving(true);
      if (isEdit) {
        await axios.put(
          `${BASE}/${dynamicProductId}/components/${component.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Component updated');
      } else {
        await axios.post(
          `${BASE}/${dynamicProductId}/components`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Component added');
      }
      onSaved?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save component';
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
        className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 gap-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            {isEdit ? 'Edit Component' : 'Add Component'}
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
          {/* Row 1: key / style / name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                {COMPONENT_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Style Key *
              </label>
              <input
                type="text"
                value={form.styleKey}
                onChange={(e) => update('styleKey', e.target.value)}
                disabled={isEdit}
                placeholder="classic / lotus / kundan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ring / Medallion — Lotus"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Row 2: flags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="cf-repeatable"
                checked={form.isRepeatable}
                onChange={(e) => update('isRepeatable', e.target.checked)}
                className="h-4 w-4 text-gold-600 rounded"
              />
              <label htmlFor="cf-repeatable" className="text-sm text-gray-700 dark:text-gray-300">
                Repeatable (multiple instances)
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Quantity
              </label>
              <input
                type="number"
                min="1"
                value={form.maxQuantity}
                onChange={(e) => update('maxQuantity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="cf-optional"
                checked={form.isOptional}
                onChange={(e) => update('isOptional', e.target.checked)}
                className="h-4 w-4 text-gold-600 rounded"
              />
              <label htmlFor="cf-optional" className="text-sm text-gray-700 dark:text-gray-300">
                Optional (customer can skip)
              </label>
            </div>
          </div>

          {/* Row 3: metal */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metal Type
              </label>
              <select
                value={form.metalType}
                onChange={(e) => update('metalType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {METAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Purity
              </label>
              <select
                value={form.purity}
                onChange={(e) => update('purity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Weight (g)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.baseWeightGrams}
                onChange={(e) => update('baseWeightGrams', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wastage %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.wastagePercentage}
                onChange={(e) => update('wastagePercentage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Row 4: purities */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Purities (customer can choose)
            </label>
            <div className="flex gap-3 flex-wrap">
              {PURITIES.map((p) => (
                <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.availablePurities.includes(p)}
                    onChange={() => togglePurity(p)}
                    className="h-4 w-4 text-gold-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Row 5: making charge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Making Charge Type
              </label>
              <select
                value={form.makingChargeType}
                onChange={(e) => update('makingChargeType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {MAKING_CHARGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Making Charge Value
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.makingChargeValue}
                onChange={(e) => update('makingChargeValue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {form.makingChargeType === 'PER_GRAM' && '₹ per gram of net weight'}
                {form.makingChargeType === 'FLAT' && '₹ flat'}
                {form.makingChargeType === 'PERCENTAGE' && '% of metal cost'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Basis
              </label>
              <select
                value={form.priceBasis}
                onChange={(e) => update('priceBasis', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {PRICE_BASIS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Row 6: gemstones */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Gemstones
              </label>
              <button
                type="button"
                onClick={addGemstone}
                className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add gemstone
              </button>
            </div>
            {form.gemstones.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                No gemstones. Click "Add gemstone" to include any.
              </p>
            ) : (
              <div className="space-y-2">
                {form.gemstones.map((g, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-2 bg-gray-50 dark:bg-dark-bg rounded-lg"
                  >
                    <input
                      placeholder="Name"
                      value={g.name}
                      onChange={(e) => updateGemstone(i, { name: e.target.value })}
                      className="col-span-2 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                    />
                    <input
                      placeholder="Type"
                      value={g.type}
                      onChange={(e) => updateGemstone(i, { type: e.target.value })}
                      className="px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="ct"
                      step="0.01"
                      value={g.carats}
                      onChange={(e) => updateGemstone(i, { carats: Number(e.target.value) })}
                      className="px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="₹/ct"
                      step="1"
                      value={g.ratePerCarat}
                      onChange={(e) => updateGemstone(i, { ratePerCarat: Number(e.target.value) })}
                      className="px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeGemstone(i)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded self-center"
                      aria-label="Remove gemstone"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
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
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'} Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComponentFormModal;