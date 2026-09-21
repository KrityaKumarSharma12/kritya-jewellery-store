import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit, Trash2, Image as ImageIcon, X, RefreshCw,
  Calendar, Link as LinkIcon, Download, Upload, GripVertical,
  Eye, CheckCircle2, Clock, Ban, TrendingUp,
  MousePointerClick, LayoutGrid, Quote, Star, BookOpen, ArrowRight,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api/admin';
const UPLOAD_API = 'http://localhost:5000/api/upload';

const STATUS_STYLE = {
  live: { bg: 'bg-green-100 text-green-800', label: 'Live', Icon: CheckCircle2 },
  scheduled: { bg: 'bg-blue-100 text-blue-800', label: 'Scheduled', Icon: Clock },
  expired: { bg: 'bg-gray-200 text-gray-700', label: 'Expired', Icon: Clock },
  inactive: { bg: 'bg-red-100 text-red-700', label: 'Inactive', Icon: Ban },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired', label: 'Expired' },
  { key: 'inactive', label: 'Inactive' },
];

const TABS = [
  { key: 'banners',      label: 'Banners',       Icon: ImageIcon },
  { key: 'categories',   label: 'Categories',    Icon: LayoutGrid },
  { key: 'collections',  label: 'Collections',   Icon: LayoutGrid },
  { key: 'testimonials', label: 'Testimonials',  Icon: Quote },
  { key: 'editorial',    label: 'Editorial',     Icon: BookOpen },
];

const normalizeImage = (url) => {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return `http://localhost:5000${url}`;
  if (url.startsWith('/')) return `http://localhost:5000${url}`;
  return url;
};

const emptyForm = {
  title: '', subtitle: '', description: '', imageUrl: '',
  link: '', buttonText: '', position: 'HOME', sortOrder: 0,
  isActive: true, startDate: '', endDate: '',
};

/* =================================================================== */
/*  Shared: ImageUploader                                              */
/* =================================================================== */

const ImageUploader = ({ value, onChange, label = 'Image' }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => fileRef.current?.click();

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('token');
      const res = await axios.post(UPLOAD_API, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      onChange(res.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex flex-col xs:flex-row items-start gap-3">
        <div className="w-32 h-20 xs:w-40 xs:h-24 bg-gray-100 dark:bg-dark-bg rounded-lg overflow-hidden flex-shrink-0 relative">
          {value ? (
            <img
              src={normalizeImage(value)}
              alt="preview"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 w-full space-y-2 min-w-0">
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or upload"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card"
          />
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="text-xs sm:text-sm px-3 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =================================================================== */
/*  Shared: Generic CRUD hook                                          */
/* =================================================================== */

const useCrudResource = (resource, token) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/${resource}`, authHeaders);
      setItems(res.data.items || res.data.data || res.data || []);
    } catch (err) {
      console.error(`${resource} fetch error:`, err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resource, token]); // eslint-disable-line

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (payload) => {
    await axios.post(`${API}/${resource}`, payload, authHeaders);
    toast.success('Created');
    fetchAll();
  };

  const update = async (id, payload) => {
    await axios.put(`${API}/${resource}/${id}`, payload, authHeaders);
    toast.success('Updated');
    fetchAll();
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await axios.delete(`${API}/${resource}/${id}`, authHeaders);
    toast.success('Deleted');
    fetchAll();
  };

  return { items, loading, create, update, remove };
};

/* =================================================================== */
/*  Tab: Categories                                                    */
/* =================================================================== */

const CategoriesTab = ({ token }) => {
  const { items, loading, create, update, remove } = useCrudResource('categories', token);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', image: '', displayOrder: 0, isActive: true });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', slug: '', image: '', displayOrder: items.length, isActive: true });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      image: c.image || '',
      displayOrder: c.displayOrder ?? 0,
      isActive: c.isActive ?? true,
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await update(editing.id || editing._id, form);
      else await create(form);
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-xs sm:text-sm text-gray-500">Controls the "Shop by Category" grid on the homepage.</p>
        <button onClick={openAdd}
          className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm self-start sm:self-auto flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState label="No categories yet" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id || c._id} className="bg-white dark:bg-dark-card rounded-2xl shadow overflow-hidden">
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                {c.image ? (
                  <img src={normalizeImage(c.image)} alt={c.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className={`absolute top-2 left-2 px-2 py-1 text-xs rounded font-medium ${
                  c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                }`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </div>
                <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/70 text-xs px-2 py-1 rounded">
                  Order: {c.displayOrder ?? 0}
                </div>
              </div>
              <div className="p-4 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">/{c.slug}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(c.id || c._id, c.name)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name *">
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="Slug * (url-friendly)">
              <input required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g. wedding"
                className={inputCls} />
            </Field>
            <ImageUploader value={form.image} onChange={(v) => setForm({ ...form, image: v })} label="Category Image" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Display Order">
                <input type="number" value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value || '0', 10) })}
                  className={inputCls} />
              </Field>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded" />
                  Active
                </label>
              </div>
            </div>
            <ModalActions onCancel={() => setShowModal(false)} submitLabel={editing ? 'Update' : 'Create'} />
          </form>
        </ModalShell>
      )}
    </>
  );
};

/* =================================================================== */
/*  Tab: Collections                                                   */
/* =================================================================== */

const CollectionsTab = ({ token }) => {
  const { items, loading, create, update, remove } = useCrudResource('collections', token);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', image: '', color: '#C9A227', displayOrder: 0, isActive: true });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', slug: '', image: '', color: '#C9A227', displayOrder: items.length, isActive: true });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      image: c.image || '',
      color: c.color || '#C9A227',
      displayOrder: c.displayOrder ?? 0,
      isActive: c.isActive ?? true,
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await update(editing.id || editing._id, form);
      else await create(form);
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-xs sm:text-sm text-gray-500">Controls the "Shop the Collections" carousel.</p>
        <button onClick={openAdd}
          className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm self-start sm:self-auto flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Collection
        </button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState label="No collections yet" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((c) => (
            <div key={c.id || c._id} className="rounded-2xl overflow-hidden shadow relative">
              <div
                className="aspect-[4/5] flex items-end p-3 sm:p-4 relative"
                style={
                  !c.image
                    ? { background: `linear-gradient(160deg, ${c.color || '#C9A227'}, #1a1a1a)` }
                    : undefined
                }
              >
                {c.image && (
                  <>
                    <img
                      src={normalizeImage(c.image)}
                      alt={c.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </>
                )}
                <div className="relative text-white min-w-0">
                  <p className="font-playfair text-base sm:text-xl truncate">{c.name}</p>
                  <p className="text-xs opacity-70 truncate">/{c.slug}</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => openEdit(c)}
                  className="p-1.5 bg-white/90 rounded-lg text-blue-600 hover:bg-white">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(c.id || c._id, c.name)}
                  className="p-1.5 bg-white/90 rounded-lg text-red-600 hover:bg-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} title={editing ? 'Edit Collection' : 'Add Collection'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name *">
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls} />
            </Field>
            <Field label="Slug *">
              <input required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className={inputCls} />
            </Field>

            <ImageUploader
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              label="Collection Image (optional — falls back to gradient)"
            />

            <Field label="Gradient Color (used when no image)">
              <input type="color" value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20 rounded border border-gray-300" />
            </Field>
            <Field label="Display Order">
              <input type="number" value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value || '0', 10) })}
                className={inputCls} />
            </Field>
            <ModalActions onCancel={() => setShowModal(false)} submitLabel={editing ? 'Update' : 'Create'} />
          </form>
        </ModalShell>
      )}
    </>
  );
};

/* =================================================================== */
/*  Tab: Testimonials                                                  */
/* =================================================================== */

const TestimonialsTab = ({ token }) => {
  const { items, loading, create, update, remove } = useCrudResource('testimonials', token);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', city: '', rating: 5, text: '', isActive: true, displayOrder: 0 });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', city: '', rating: 5, text: '', isActive: true, displayOrder: items.length });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      city: t.city || '',
      rating: t.rating ?? 5,
      text: t.text || '',
      isActive: t.isActive ?? true,
      displayOrder: t.displayOrder ?? 0,
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await update(editing.id || editing._id, form);
      else await create(form);
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-xs sm:text-sm text-gray-500">Controls the "What Our Customers Say" section.</p>
        <button onClick={openAdd}
          className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm self-start sm:self-auto flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState label="No testimonials yet" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((t) => (
            <div
              key={t.id || t._id}
              className="group bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2 gap-2">
                <div className="flex gap-0.5 text-gold-500">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star
                      key={k}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      fill={k < (t.rating || 5) ? 'currentColor' : 'none'}
                      stroke={k < (t.rating || 5) ? 'currentColor' : '#D1D5DB'}
                    />
                  ))}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(t)}
                    title="Edit"
                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    aria-label="Edit testimonial"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id || t._id, t.name)}
                    title="Delete"
                    className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                    aria-label="Delete testimonial"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 px-4 sm:px-5 py-2 flex gap-2 min-w-0">
                <Quote
                  className="h-4 w-4 text-gold-300 dark:text-gold-700 shrink-0 mt-0.5"
                  fill="currentColor"
                />
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">
                  {t.text}
                </p>
              </div>

              <div className="flex items-center justify-between px-4 sm:px-5 py-3 mt-2 border-t border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-gold-700 dark:text-gold-300 font-semibold text-xs flex-shrink-0">
                    {(t.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {t.name}
                    </p>
                    {t.city && (
                      <p className="text-xs text-gray-400 truncate">{t.city}</p>
                    )}
                  </div>
                </div>

                {!t.isActive && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium flex-shrink-0">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} title={editing ? 'Edit Testimonial' : 'Add Testimonial'}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *">
                <input required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="City">
                <input value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <Field label="Rating (1–5)">
              <div className="flex gap-1 flex-wrap items-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: n })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      fill={n <= form.rating ? 'currentColor' : 'none'}
                      stroke={n <= form.rating ? 'currentColor' : '#9CA3AF'}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs sm:text-sm text-gray-500">
                  ({form.rating}/5)
                </span>
              </div>
            </Field>

            <Field label="Quote *">
              <textarea required rows="4" value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="What did the customer say?"
                className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Display Order">
                <input type="number" value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value || '0', 10) })}
                  className={inputCls} />
              </Field>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 text-gold-600 rounded" />
                  Active
                </label>
              </div>
            </div>

            <ModalActions onCancel={() => setShowModal(false)} submitLabel={editing ? 'Update' : 'Create'} />
          </form>
        </ModalShell>
      )}
    </>
  );
};

/* =================================================================== */
/*  Tab: Editorial                                                     */
/* =================================================================== */
const EditorialTab = ({ token }) => {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    eyebrow: 'Our Story',
    heading: 'Heirlooms crafted with intention',
    body: '',
    ctaText: 'Read Our Story',
    ctaLink: '/about',
    imageUrl: '',
    statValue: '25+',
    statLabel: 'Years of Trust',
  });

  const loadEditorial = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/homepage/editorial`, authHeaders);
      if (res.data) setForm((f) => ({ ...f, ...res.data }));
    } catch (err) {
      // ignore — first-time setup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEditorial(); }, [token]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put(`${API}/homepage/editorial`, form, authHeaders);
      toast.success('Editorial saved');
      setShowModal(false);
      loadEditorial();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-xs sm:text-sm text-gray-500">
          Controls the "Our Story" editorial banner between Testimonials and Stats.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm self-start sm:self-auto flex-shrink-0"
        >
          <Edit className="h-4 w-4" /> Edit Editorial
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow overflow-hidden max-w-3xl">
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-600 mb-2">
              {form.eyebrow}
            </p>
            <h3 className="text-lg sm:text-2xl font-playfair font-bold text-gray-800 dark:text-white">
              {form.heading}
            </h3>
            <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
              {form.body}
            </p>
            <div className="mt-4 flex items-center gap-2 text-gold-600 text-xs sm:text-sm font-semibold">
              {form.ctaText} <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 order-1 md:order-2">
            {form.imageUrl ? (
              <img
                src={normalizeImage(form.imageUrl)}
                alt={form.heading}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-dark-bg px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-dark-border flex flex-wrap justify-between items-center gap-2">
          <span className="text-xs text-gray-500">
            Bottom-left badge: <strong>{form.statValue}</strong> {form.statLabel}
          </span>
        </div>
      </div>

      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} title="Edit Editorial">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Eyebrow">
                <input value={form.eyebrow}
                  onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Heading">
                <input value={form.heading}
                  onChange={(e) => setForm({ ...form, heading: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <Field label="Body Text">
              <textarea rows="4" value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CTA Text">
                <input value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="CTA Link">
                <input value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <ImageUploader value={form.imageUrl}
              onChange={(v) => setForm({ ...form, imageUrl: v })}
              label="Editorial Image" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Stat Value">
                <input value={form.statValue}
                  onChange={(e) => setForm({ ...form, statValue: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Stat Label">
                <input value={form.statLabel}
                  onChange={(e) => setForm({ ...form, statLabel: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <ModalActions onCancel={() => setShowModal(false)} submitLabel={saving ? 'Saving…' : 'Update'} />
          </form>
        </ModalShell>
      )}
    </>
  );
};

/* =================================================================== */
/*  Banner Tab (existing logic preserved)                              */
/* =================================================================== */

const BannerTab = ({ token }) => {
  const [banners, setBanners] = useState([]);
  const [stats, setStats] = useState({
    total: 0, live: 0, scheduled: 0, expired: 0, inactive: 0,
    totalClicks: 0, totalViews: 0, ctr: 0, topPerformer: null,
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [dragId, setDragId] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBanners = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/banners`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: debounced || undefined, status: filter, page, limit: 50 },
      });
      setBanners(res.data.banners || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, [debounced, filter, token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/banners/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [token]);

  useEffect(() => { fetchBanners(1); }, [debounced, filter]); // eslint-disable-line
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const refresh = () => { fetchBanners(pagination.page); fetchStats(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBanner ? `${API}/banners/${editingBanner.id}` : `${API}/banners`;
      await axios({
        method: editingBanner ? 'put' : 'post',
        url,
        data: formData,
        ...authHeaders,
      });
      toast.success(editingBanner ? 'Banner updated' : 'Banner created');
      closeModal();
      refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save banner');
    }
  };

  const openAddModal = () => {
    setEditingBanner(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      ...banner,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await axios.delete(`${API}/banners/${banner.id}`, authHeaders);
      toast.success('Banner deleted');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  const handleDragStart = (id) => setDragId(id);

  const handleDragOver = (e, overId) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const fromIdx = banners.findIndex((b) => b.id === dragId);
    const toIdx = banners.findIndex((b) => b.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...banners];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setBanners(reordered);
  };

  const handleDragEnd = async () => {
    if (!dragId) return;
    setDragId(null);
    try {
      const items = banners.map((b, i) => ({ id: b.id, sortOrder: i }));
      await axios.patch(`${API}/banners/reorder`, { items }, authHeaders);
      toast.success('Order saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
      fetchBanners(pagination.page);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/banners/export/csv`, {
        ...authHeaders,
        params: { search: debounced || undefined, status: filter },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `banners-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '—';

  const daysUntil = (d) => {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
        <button onClick={refresh}
          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
          <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Refresh
        </button>
        <button onClick={handleExport}
          className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition flex items-center gap-2 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Export CSV
        </button>
        <button onClick={openAddModal}
          className="bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg text-xs sm:text-sm">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Banner
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Live" value={stats.live} color="text-green-600" Icon={CheckCircle2} />
        <StatCard label="Scheduled" value={stats.scheduled} color="text-blue-600" Icon={Clock} />
        <StatCard label="Expired" value={stats.expired} color="text-gray-500" Icon={Clock} />
        <StatCard label="Inactive" value={stats.inactive} color="text-red-600" Icon={Ban} />
      </div>

      {(stats.totalViews > 0 || stats.totalClicks > 0) && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow p-3 sm:p-4 flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm mb-4">
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Eye className="h-4 w-4" />
            <strong>{stats.totalViews.toLocaleString('en-IN')}</strong> views
          </span>
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <MousePointerClick className="h-4 w-4" />
            <strong>{stats.totalClicks.toLocaleString('en-IN')}</strong> clicks
          </span>
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <TrendingUp className="h-4 w-4" />
            <strong>{stats.ctr}%</strong> CTR
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-lg overflow-x-auto flex-shrink-0">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition whitespace-nowrap ${
                filter === f.key
                  ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search banners by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 sm:min-w-[200px] px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {loading ? <Spinner /> : banners.length === 0 ? (
        <EmptyState label="No banners match your filters" Icon={ImageIcon} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {banners.map((banner) => {
            const style = STATUS_STYLE[banner.status] || STATUS_STYLE.inactive;
            const img = normalizeImage(banner.imageUrl);
            const days = banner.status === 'scheduled' ? daysUntil(banner.startDate) : null;

            return (
              <div
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(banner.id)}
                onDragOver={(e) => handleDragOver(e, banner.id)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition group ${
                  dragId === banner.id ? 'opacity-50' : ''
                }`}
              >
                <div className="relative h-44 sm:h-48 bg-gray-100 dark:bg-gray-800">
                  {img ? (
                    <img src={img} alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                    <div className="text-white min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">{banner.title}</h3>
                      {banner.subtitle && <p className="text-xs sm:text-sm opacity-90 truncate">{banner.subtitle}</p>}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 p-1 rounded cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                  </div>
                  <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${style.bg}`}>
                    <style.Icon className="h-3 w-3" />
                    {style.label}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/70 text-gray-800 dark:text-white px-2 py-1 text-xs rounded">
                    {banner.position}
                  </div>
                </div>

                <div className="p-3 sm:p-4 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 truncate min-w-0">
                      <LinkIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{banner.link || 'No link'}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditModal(banner)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(banner)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {banner.status === 'scheduled' && days !== null && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Starts in {days} day{days === 1 ? '' : 's'}
                    </p>
                  )}
                  {(banner.startDate || banner.endDate) && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {fmtDate(banner.startDate)} → {fmtDate(banner.endDate)}
                    </div>
                  )}
                  {(banner.views > 0 || banner.clicks > 0) && (
                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-dark-border flex-wrap">
                      <span>{banner.views} views</span>
                      <span>{banner.clicks} clicks</span>
                      <span className="text-gold-600 font-medium">
                        {banner.views > 0 ? ((banner.clicks / banner.views) * 100).toFixed(1) : '0.0'}% CTR
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalShell onClose={closeModal} title={editingBanner ? 'Edit Banner' : 'Add Banner'} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ImageUploader value={formData.imageUrl}
              onChange={(v) => setFormData({ ...formData, imageUrl: v })}
              label="Image *" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title *">
                <input required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Subtitle">
                <input value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <Field label="Description">
              <textarea rows="2" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputCls} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Link URL">
                <input value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="/collections/diamond"
                  className={inputCls} />
              </Field>
              <Field label="Button Text">
                <input value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="Shop Now"
                  className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Position">
                <select value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className={inputCls}>
                  <option value="HOME">Homepage</option>
                  <option value="CATEGORY">Category Page</option>
                  <option value="PRODUCT">Product Page</option>
                </select>
              </Field>
              <Field label="Sort Order">
                <input type="number" value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value || '0', 10) })}
                  className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">Lower = earlier</p>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date (optional)">
                <input type="date" value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="End Date (optional)">
                <input type="date" value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0" />
              Active
            </label>

            <ModalActions onCancel={closeModal} submitLabel={editingBanner ? 'Update' : 'Create'} />
          </form>
        </ModalShell>
      )}
    </>
  );
};

/* =================================================================== */
/*  Shell + shared UI helpers                                          */
/* =================================================================== */

const BannerManagement = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('banners');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
          Homepage CMS
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
          Manage every section that appears on the homepage
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-dark-bg p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg whitespace-nowrap transition ${
              tab === key
                ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === 'banners'      && <BannerTab token={token} />}
        {tab === 'categories'   && <CategoriesTab token={token} />}
        {tab === 'collections'  && <CollectionsTab token={token} />}
        {tab === 'testimonials' && <TestimonialsTab token={token} />}
        {tab === 'editorial'    && <EditorialTab token={token} />}
      </div>
    </div>
  );
};

/* -------------------- tiny shared components -------------------- */

const inputCls = 'w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base';

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const ModalShell = ({ children, onClose, title, wide }) => (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
    onClick={onClose}
  >
    <div
      className={`bg-white dark:bg-dark-card rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto p-4 sm:p-6`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">{title}</h2>
        <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition flex-shrink-0" aria-label="Close">
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions = ({ onCancel, submitLabel }) => (
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
    <button type="button" onClick={onCancel}
      className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition text-sm sm:text-base">
      Cancel
    </button>
    <button type="submit"
      className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg text-sm sm:text-base">
      {submitLabel}
    </button>
  </div>
);

const Spinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
  </div>
);

const EmptyState = ({ label, Icon = ImageIcon }) => (
  <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
    <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
    <p className="text-sm sm:text-base text-gray-500">{label}</p>
  </div>
);

const StatCard = ({ label, value, color, Icon }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-3 sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className={`text-lg sm:text-2xl font-bold mt-1 ${color} truncate`}>{value}</p>
      </div>
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-50 dark:bg-dark-bg flex items-center justify-center flex-shrink-0">
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
      </div>
    </div>
  </div>
);

export default BannerManagement;