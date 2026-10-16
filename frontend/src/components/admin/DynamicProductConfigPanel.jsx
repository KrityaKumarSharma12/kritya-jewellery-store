import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Save,
  Settings, Puzzle, Ruler, Calculator, Plus, Edit, Trash2,
  Image as ImageIcon, RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ComponentFormModal from './ComponentFormModal';
import SizingRuleFormModal from './SizingRuleFormModal';

const BASE = 'http://localhost:5000/api/admin/dynamic-products';
const UPLOAD_URL = 'http://localhost:5000/api/upload';

/**
 * Reusable tabbed config panel for a DynamicProduct.
 * Used by both the standalone DynamicProductEditor page and the unified AddProductPage.
 *
 * Props:
 *   - dynamicProductId: string (required)
 *   - token: string (required — pass the auth token explicitly since this isn't inside a page)
 */
const DynamicProductConfigPanel = ({ dynamicProductId, token }) => {
  const [dp, setDp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const [overview, setOverview] = useState({
    maxRings: '',
    maxChainsPerRing: '',
    maxMedallions: '',
    bundleDiscountPct: '',
    isActive: true,
    chainLengthByFinger: { thumb: '', index: '', middle: '', ring: '', pinky: '' },
  });
  const [savingOverview, setSavingOverview] = useState(false);

  const [componentModal, setComponentModal] = useState({ open: false, component: null });
  const [ruleModal, setRuleModal] = useState({ open: false, rule: null });

  // ---------------- Fetch ----------------
  const fetchDp = useCallback(async () => {
    if (!dynamicProductId) return;
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/${dynamicProductId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDp(res.data);
      setOverview({
        maxRings: res.data.maxRings ?? 5,
        maxChainsPerRing: res.data.maxChainsPerRing ?? 1,
        maxMedallions: res.data.maxMedallions ?? 1,
        bundleDiscountPct: res.data.bundleDiscountPct ?? '',
        isActive: res.data.isActive !== false,
        chainLengthByFinger: {
          thumb: res.data.chainLengthByFinger?.thumb ?? '',
          index: res.data.chainLengthByFinger?.index ?? '',
          middle: res.data.chainLengthByFinger?.middle ?? '',
          ring: res.data.chainLengthByFinger?.ring ?? '',
          pinky: res.data.chainLengthByFinger?.pinky ?? '',
        },
      });
    } catch (err) {
      console.error('Fetch DP error:', err);
      toast.error('Failed to load dynamic product');
      setDp(null);
    } finally {
      setLoading(false);
    }
  }, [dynamicProductId, token]);

  useEffect(() => { fetchDp(); }, [fetchDp]);

  // ---------------- Save overview ----------------
  const handleSaveOverview = async () => {
    try {
      setSavingOverview(true);
      const payload = {
        maxRings: Number(overview.maxRings) || 0,
        maxChainsPerRing: Number(overview.maxChainsPerRing) || 1,
        maxMedallions: Number(overview.maxMedallions) || 0,
        bundleDiscountPct:
          overview.bundleDiscountPct === '' ? null : Number(overview.bundleDiscountPct),
        isActive: !!overview.isActive,
        chainLengthByFinger: Object.fromEntries(
          Object.entries(overview.chainLengthByFinger).map(([k, v]) => [k, Number(v) || 0])
        ),
      };
      await axios.put(`${BASE}/${dynamicProductId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Overview saved');
      await fetchDp();
    } catch (err) {
      console.error('Save overview error:', err);
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingOverview(false);
    }
  };

  // ---------------- Delete component ----------------
  const handleDeleteComponent = async (component) => {
    if (!window.confirm(`Delete component "${component.name}"?\n\nThis cannot be undone.`)) return;
    try {
      await axios.delete(`${BASE}/${dynamicProductId}/components/${component.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Component deleted');
      await fetchDp();
    } catch (err) {
      console.error('Delete component error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---------------- Delete sizing rule ----------------
  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete sizing rule "${rule.sizeOption}"?`)) return;
    try {
      await axios.delete(`${BASE}/${dynamicProductId}/sizing-rules/${rule.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Sizing rule deleted');
      await fetchDp();
    } catch (err) {
      console.error('Delete rule error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---------------- Render ----------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
      </div>
    );
  }

  if (!dp) {
    return (
      <div className="text-center py-10 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Could not load dynamic product configuration.
        </p>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'components', label: `Components (${dp.components?.length || 0})`, icon: Puzzle },
    { id: 'sizing', label: `Sizing Rules (${dp.sizingRules?.length || 0})`, icon: Ruler },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'test', label: 'Test Price', icon: Calculator },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section nav */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-dark-border overflow-x-auto">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active
                  ? 'border-gold-600 text-gold-600 dark:text-gold-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Caps & Limits</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumField
              label="Max Rings"
              value={overview.maxRings}
              onChange={(v) => setOverview({ ...overview, maxRings: v })}
              min={0}
              max={10}
              hint="Maximum rings a customer can select (0 = unlimited)"
            />
            <NumField
              label="Max Chains Per Ring"
              value={overview.maxChainsPerRing}
              onChange={(v) => setOverview({ ...overview, maxChainsPerRing: v })}
              min={1}
              max={5}
              hint="Usually 1"
            />
            <NumField
              label="Max Medallions"
              value={overview.maxMedallions}
              onChange={(v) => setOverview({ ...overview, maxMedallions: v })}
              min={0}
              max={3}
              hint="0 = disabled, 1 = single"
            />
          </div>

          <NumField
            label="Bundle Discount %"
            value={overview.bundleDiscountPct}
            onChange={(v) => setOverview({ ...overview, bundleDiscountPct: v })}
            min={0}
            max={100}
            hint="Only applies to Couple Bands / Bridal Sets"
          />

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Chain Length by Finger (cm)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {['thumb', 'index', 'middle', 'ring', 'pinky'].map((f) => (
                <div key={f}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">
                    {f}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={overview.chainLengthByFinger[f]}
                    onChange={(e) =>
                      setOverview({
                        ...overview,
                        chainLengthByFinger: {
                          ...overview.chainLengthByFinger,
                          [f]: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dp-isactive"
              checked={overview.isActive}
              onChange={(e) => setOverview({ ...overview, isActive: e.target.checked })}
              className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500"
            />
            <label htmlFor="dp-isactive" className="text-sm text-gray-700 dark:text-gray-300">
              Active (visible on storefront)
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-dark-border">
            <button
              onClick={handleSaveOverview}
              disabled={savingOverview}
              className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-5 py-2 rounded-lg transition shadow-lg disabled:opacity-50 text-sm"
            >
              {savingOverview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingOverview ? 'Saving...' : 'Save Overview'}
            </button>
          </div>
        </div>
      )}

      {/* COMPONENTS */}
      {activeSection === 'components' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Components</h2>
            <button
              onClick={() => setComponentModal({ open: true, component: null })}
              className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-lg transition shadow-lg text-sm"
            >
              <Plus className="h-4 w-4" /> Add Component
            </button>
          </div>

          {dp.components?.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
              <Puzzle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No components yet. Add your first ring, bridge, medallion, or bracelet.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key / Style</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Wt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wastage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Making</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purities</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {dp.components.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition">
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-white">{c.name}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">
                          {c.componentKey}/{c.styleKey}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {Number(c.baseWeightGrams).toFixed(3)}g
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {Number(c.wastagePercentage).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                          {c.makingChargeType}
                          {c.makingChargeType === 'FLAT' && ` ₹${c.makingChargeValue}`}
                          {c.makingChargeType === 'PER_GRAM' && ` ₹${c.makingChargeValue}/g`}
                          {c.makingChargeType === 'PERCENTAGE' && ` ${c.makingChargeValue}%`}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {(c.availablePurities || []).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setComponentModal({ open: true, component: c })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteComponent(c)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {dp.components.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white">
                          {c.name}
                        </p>
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                          {c.componentKey}/{c.styleKey}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setComponentModal({ open: true, component: c })}
                          className="p-1.5 text-blue-600 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComponent(c)}
                          className="p-1.5 text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="text-gray-500 dark:text-gray-400">
                        Wt: <span className="text-gray-800 dark:text-white">{Number(c.baseWeightGrams).toFixed(3)}g</span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        Wastage: <span className="text-gray-800 dark:text-white">{Number(c.wastagePercentage).toFixed(2)}%</span>
                      </div>
                      <div className="col-span-2 text-gray-500 dark:text-gray-400">
                        Purities: <span className="text-gray-800 dark:text-white">{(c.availablePurities || []).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* SIZING RULES */}
      {activeSection === 'sizing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Sizing Rules</h2>
            <button
              onClick={() => setRuleModal({ open: true, rule: null })}
              className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded-lg transition shadow-lg text-sm"
            >
              <Plus className="h-4 w-4" /> Add Sizing Rule
            </button>
          </div>

          {dp.sizingRules?.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
              <Ruler className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No sizing rules yet. Add one per size option.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size Option</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surge</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {dp.sizingRules.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition">
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{r.componentKey}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-white">{r.sizeOption}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {Number(r.weightSurgeGrams).toFixed(3)}g
                        </td>
                        <td className="px-4 py-3">
                          {r.isDefault && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setRuleModal({ open: true, rule: r })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(r)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {dp.sizingRules.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{r.componentKey}</p>
                        <p className="font-semibold text-sm text-gray-800 dark:text-white mt-0.5">{r.sizeOption}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Surge: {Number(r.weightSurgeGrams).toFixed(3)}g
                          {r.isDefault && ' · Default'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setRuleModal({ open: true, rule: r })}
                          className="p-1.5 text-blue-600 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(r)}
                          className="p-1.5 text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* MEDIA */}
      {activeSection === 'media' && (
        <MediaSection dynamicProductId={dynamicProductId} token={token} />
      )}

      {/* TEST PRICE */}
      {activeSection === 'test' && (
        <TestPriceSection dp={dp} token={token} />
      )}

      {/* Modals */}
      {componentModal.open && (
        <ComponentFormModal
          dynamicProductId={dynamicProductId}
          component={componentModal.component}
          existingComponents={dp.components || []}
          token={token}
          onClose={() => setComponentModal({ open: false, component: null })}
          onSaved={async () => {
            setComponentModal({ open: false, component: null });
            await fetchDp();
          }}
        />
      )}
      {ruleModal.open && (
        <SizingRuleFormModal
          dynamicProductId={dynamicProductId}
          rule={ruleModal.rule}
          existingRules={dp.sizingRules || []}
          components={dp.components || []}
          token={token}
          onClose={() => setRuleModal({ open: false, rule: null })}
          onSaved={async () => {
            setRuleModal({ open: false, rule: null });
            await fetchDp();
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// Sub-components
// ============================================================

const NumField = ({ label, value, onChange, min, max, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
    />
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ============================================================
// Media Section — one upload zone per color
// ============================================================
const MEDIA_COLORS = [
  { value: 'Rose',   label: 'Rose Gold' },
  { value: 'Yellow', label: 'Yellow Gold' },
  { value: 'White',  label: 'White Gold' },
];

const MediaSection = ({ dynamicProductId, token }) => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE}/${dynamicProductId}/media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMedia(res.data?.media || []);
    } catch (err) {
      console.error('Fetch media error:', err);
      toast.error('Failed to load media');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [dynamicProductId, token]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (color, fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingColor(color);
    try {
      const files = Array.from(fileList);
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await axios.post(UPLOAD_URL, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let url = uploadRes.data?.url || uploadRes.data?.secure_url || uploadRes.data?.fileUrl;
        if (url && url.startsWith('/')) url = `http://localhost:5000${url}`;
        if (!url) throw new Error('Upload succeeded but no URL returned');

        const isFirstOverall = media.length === 0;

        await axios.post(
          `${BASE}/${dynamicProductId}/media`,
          { url, color, type: 'image', isPrimary: isFirstOverall },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast.success(
        `${files.length} ${color} image${files.length > 1 ? 's' : ''} uploaded`
      );
      await fetchMedia();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload');
    } finally {
      setUploadingColor(null);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete this ${m.color} image?`)) return;
    try {
      setDeleting(m.id);
      await axios.delete(
        `${BASE}/${dynamicProductId}/media/${m.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Image removed');
      await fetchMedia();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Product Media
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload images per metal color. They appear on the storefront product page,
          grouped by color.
        </p>
      </div>

      {MEDIA_COLORS.map((c) => {
        const colorMedia = media.filter((m) => m.color === c.value);
        const isUploading = uploadingColor === c.value;

        return (
          <div
            key={c.value}
            className="border border-gray-200 dark:border-dark-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 ${
                  c.value === 'Rose'
                    ? 'bg-rose-300'
                    : c.value === 'Yellow'
                    ? 'bg-yellow-400'
                    : 'bg-gray-200'
                }`}
              />
              <h3 className="font-semibold text-sm text-gray-800 dark:text-white">
                {c.label}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({colorMedia.length} image{colorMedia.length !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {colorMedia.map((m, i) => (
                <div
                  key={m.id}
                  className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group bg-gray-50"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <img
                    src={m.url}
                    alt={`${c.label} ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.background = '#fee2e2'; }}
                  />
                  {m.isPrimary && (
                    <span className="absolute top-1 left-1 bg-gold-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    disabled={deleting === m.id}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition disabled:opacity-50"
                    aria-label="Remove media"
                  >
                    {deleting === m.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))}

              {isUploading ? (
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
                    onChange={(e) => handleUpload(c.value, e.target.files)}
                  />
                </label>
              )}
            </div>

            {colorMedia.length === 0 && !isUploading && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                No {c.label.toLowerCase()} images yet.
              </p>
            )}
          </div>
        );
      })}

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-100 dark:border-dark-border">
        Tip: the first image uploaded becomes the primary thumbnail for the product.
      </p>
    </div>
  );
};

// Test price preview
const TestPriceSection = ({ dp, token }) => {
  const [config, setConfig] = useState({
    version: 3,
    hand: 'right',
    rings: [{ finger: 'middle', size: 'size_6', karat: '22K' }],
    medallion: { enabled: false, styleKey: 'lotus', karat: '22K' },
    bracelet: { size: '6.0_inch', karat: '22K' },
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `http://localhost:5000/api/admin/dynamic-products/${dp.id}/test-price`,
        { configuration: config },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      console.error('Test price error:', err);
      toast.error(err.response?.data?.message || 'Failed to compute price');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Test Price Preview</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Uses the same engine as the customer path. Build a config below and run it.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Raw Configuration (JSON)
        </label>
        <textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try {
              setConfig(JSON.parse(e.target.value));
            } catch {
              /* ignore while typing */
            }
          }}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg font-mono text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-5 py-2 rounded-lg transition shadow-lg disabled:opacity-50 text-sm"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
        {loading ? 'Computing...' : 'Compute Price'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gradient-to-br from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 rounded-xl border border-gold-200 dark:border-gold-800">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Grand Total</span>
            <span className="text-2xl font-bold text-gold-700 dark:text-gold-400">
              ₹{Number(result.total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{Number(result.subtotal).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Embedded GST:</span>
              <span>₹{Number(result.embeddedTax).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Pieces:</span>
              <span>{result.componentBreakdowns?.length || 0}</span>
            </div>
          </div>

          {result.componentBreakdowns?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gold-300 dark:border-gold-700 space-y-1 text-xs">
              {result.componentBreakdowns.map((b, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {b.name}
                    {b.finger ? ` (${b.finger})` : ''}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    ₹{Number(b.componentTotal).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicProductConfigPanel;