import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Sparkles, Image as ImageIcon,
  Trash2, RefreshCw, AlertCircle, Save,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Map frontend "type" values → backend enum values
const DYNAMIC_TYPES = [
  { value: 'HAATH_PHOOL', label: 'Haath Phool' },
  { value: 'COUPLE_BANDS', label: 'Couple Bands' },
  { value: 'BRIDAL_SET',   label: 'Bridal Set' },
];

// Frontend type → Product.category string (used for breadcrumb / listing)
const CATEGORY_BY_TYPE = {
  HAATH_PHOOL:  'Haath Phool',
  COUPLE_BANDS: 'Couple Bands',
  BRIDAL_SET:   'Bridal Set',
};

// Default initial layout for each dynamic type.
// These are just starting values the admin can edit in the editor.
const DEFAULT_CAPS = {
  HAATH_PHOOL: {
    maxRings: 5,
    maxChainsPerRing: 1,
    maxMedallions: 1,
    chainLengthByFinger: { thumb: 8, index: 11, middle: 13, ring: 12, pinky: 9 },
  },
  COUPLE_BANDS: {
    maxRings: 2,
    maxChainsPerRing: 1,
    maxMedallions: 0,
    chainLengthByFinger: {},
  },
  BRIDAL_SET: {
    maxRings: 5,
    maxChainsPerRing: 1,
    maxMedallions: 1,
    chainLengthByFinger: { thumb: 8, index: 11, middle: 13, ring: 12, pinky: 9 },
  },
};

const PLACEHOLDER_COLORS = [
  { value: 'Rose',   label: 'Rose Gold' },
  { value: 'Yellow', label: 'Yellow Gold' },
  { value: 'White',  label: 'White Gold' },
];

const AddDynamicProductPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [form, setForm] = useState({
    name: '',
    type: 'HAATH_PHOOL',
    color: 'Yellow',
    description: '',
  });

  const [media, setMedia] = useState([]); // { color, url, type }
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ============================================================
  // Media upload — same pattern as AddProductPage
  // ============================================================
  const handleUpload = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(
          'http://localhost:5000/api/upload',
          fd,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let url = res.data?.url || res.data?.secure_url || res.data?.fileUrl;
        if (url && url.startsWith('/')) url = `http://localhost:5000${url}`;
        if (!url) throw new Error('No URL returned from upload');
        uploaded.push({ color: form.color, url, type: 'image' });
      }
      setMedia((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} added`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  }, [token, form.color]);

  const removeMedia = (url) => {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  };

  // ============================================================
  // Submit — creates Product, then DynamicProduct, then redirects
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      return setError('Product name is required');
    }

    try {
      setSaving(true);

      // -------- Step 1: create the Product with a placeholder variant --------
      const category = CATEGORY_BY_TYPE[form.type] || 'Dynamic Product';
      const productPayload = {
        name: form.name.trim(),
        category,
        description: form.description.trim() || `Dynamic ${category} product`,
        // Placeholder variant — ignored by the dynamic engine, but
        // required by the ProductVariant schema constraints.
        variants: [
          {
            metal: 'GOLD',
            metalKarat: 22,
            metalWeight: 1,
            metalColor: form.color,
            productSize: 'Free size',
            stock: 100,
            sku: null,
          },
        ],
        colorMedia: media.map((m) => ({
          color: m.color,
          url: m.url,
          type: m.type,
        })),
        productSizing: 'Free size',
        returnPolicy: 'Apply global Return Policy',
        note: 'Apply global Note',
        gst: 3,
        continueSelling: false,
      };

      const productRes = await axios.post(
        'http://localhost:5000/api/products/premium',
        productPayload,
        { headers }
      );

      const productId =
        productRes.data?.product?.id ||
        productRes.data?.id;

      if (!productId) {
        throw new Error('Product was created but no ID was returned');
      }

      // -------- Step 2: create the linked DynamicProduct --------
      const caps = DEFAULT_CAPS[form.type] || DEFAULT_CAPS.HAATH_PHOOL;

      const dpPayload = {
        productId,
        type: form.type,
        maxRings: caps.maxRings,
        maxChainsPerRing: caps.maxChainsPerRing,
        maxMedallions: caps.maxMedallions,
        chainLengthByFinger: caps.chainLengthByFinger,
        isActive: true,
      };

      const dpRes = await axios.post(
        'http://localhost:5000/api/admin/dynamic-products',
        dpPayload,
        { headers }
      );

      const dpId =
        dpRes.data?.dynamicProduct?.id ||
        dpRes.data?.id;

      if (!dpId) {
        throw new Error(
          'Product created but Dynamic Product could not be linked — please configure it from the Dynamic Products list.'
        );
      }

      toast.success('Dynamic product created');
      navigate(`/admin/dynamic-products/${dpId}`);
    } catch (err) {
      console.error('Create dynamic product error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create dynamic product';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/dynamic-products')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gold-600 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dynamic Products
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white">
          Create Dynamic Product
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set up the product shell, then configure its components in the editor.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ---------------- Basic info ---------------- */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Basic Information
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Test — Kundan Lotus Haath Phool"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dynamic Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {DYNAMIC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Determines the pricing engine and configurator used on the PDP.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Placeholder Metal Color *
              </label>
              <select
                value={form.color}
                onChange={(e) => update('color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {PLACEHOLDER_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used to group images in the gallery. Can't be changed later without re-creating the product.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              placeholder="Short description of this dynamic product..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
            />
          </div>
        </div>

        {/* ---------------- Media ---------------- */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-gold-600" />
              Product Media
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optional. You can also add more images later from the Product Edit page.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((m, i) => (
              <div
                key={i}
                className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group bg-gray-50"
                style={{ aspectRatio: '1 / 1' }}
              >
                <img
                  src={m.url}
                  alt={`Media ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.background = '#fee2e2'; }}
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-gold-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.url)}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  aria-label="Remove media"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            {uploading ? (
              <div className="aspect-square flex items-center justify-center border-2 border-dashed border-gold-400 rounded-lg bg-gold-50 dark:bg-gold-900/20">
                <RefreshCw className="h-5 w-5 text-gold-600 animate-spin" />
              </div>
            ) : (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg cursor-pointer hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition">
                <ImageIcon className="h-5 w-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        {/* ---------------- Info banner ---------------- */}
        <div className="p-4 bg-gold-50 dark:bg-gold-900/20 rounded-xl border border-gold-200 dark:border-gold-800 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-gold-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gold-800 dark:text-gold-300">
              What happens next?
            </p>
            <p className="text-xs text-gold-700 dark:text-gold-400 mt-1">
              Clicking Create sets up a placeholder product with sensible default caps
              ({DEFAULT_CAPS[form.type]?.maxRings} rings max, {DEFAULT_CAPS[form.type]?.maxMedallions} medallions max).
              You'll be redirected to the editor to add components, sizing rules, and purities.
            </p>
          </div>
        </div>

        {/* ---------------- Actions ---------------- */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dynamic-products')}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Creating...' : 'Create & Configure'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDynamicProductPage;