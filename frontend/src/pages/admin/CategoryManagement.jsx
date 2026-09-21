import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Search, X,
  Image as ImageIcon, Loader2, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/categories';

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  image: '',
  isActive: true,
  displayOrder: 0,
};

// ============================================================
// Slugify helper — mirrors the backend's logic
// ============================================================
const slugify = (str) =>
  (str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { token } = useAuth();

  // ============== FETCH ==============
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ============== MODAL HANDLERS ==============
  const openAddModal = () => {
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    // ⭐ FIX: only send the fields the backend actually uses.
    // Never spread the whole category object (id, subcategories,
    // createdAt, updatedAt will crash Prisma).
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      isActive: category.isActive !== false,
      displayOrder: category.displayOrder ?? 0,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setError('');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // ⭐ Auto-generate slug from name if slug is empty or untouched
      if (field === 'name') {
        const isSlugAuto = !prev.slug || prev.slug === slugify(prev.name);
        if (isSlugAuto) next.slug = slugify(value);
      }
      return next;
    });
  };

  // ============== SUBMIT ==============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    // Build a clean payload — only send what the backend expects
    const payload = {
      name: formData.name.trim(),
      slug: formData.slug?.trim() || slugify(formData.name),
      description: formData.description?.trim() || null,
      image: formData.image?.trim() || null,
      isActive: formData.isActive !== false,
      displayOrder: Number.isFinite(Number(formData.displayOrder))
        ? parseInt(formData.displayOrder, 10)
        : 0,
    };

    try {
      setSaving(true);

      if (editingCategory) {
        await axios.put(`${API}/${editingCategory.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Category updated');
      } else {
        await axios.post(API, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Category created');
      }

      closeModal();
      await fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save category';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ============== DELETE ==============
  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(category.id);
      await axios.delete(`${API}/${category.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Category deleted');
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete category';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ============== FILTER ==============
  const filteredCategories = categories.filter((c) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      c?.name?.toLowerCase().includes(s) ||
      c?.slug?.toLowerCase().includes(s) ||
      c?.description?.toLowerCase().includes(s)
    );
  });

  // ============== RENDER ==============
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Categories
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage product categories
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Category
        </button>
      </div>

      {/* ========== SEARCH ========== */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {/* ========== LIST ========== */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'No categories match your search' : 'No categories yet'}
          </p>
          {!searchTerm && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-5 py-2 rounded-lg transition text-sm sm:text-base"
            >
              <Plus className="h-4 w-4" /> Add Your First Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={openEditModal}
              onDelete={handleDelete}
              deleting={deletingId === category.id}
            />
          ))}
        </div>
      )}

      {/* ========== MODAL ========== */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold text-gray-800 dark:text-white truncate">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={closeModal}
                disabled={saving}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg disabled:opacity-50 flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-xs sm:text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  placeholder="e.g. Necklaces"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="auto-generated from name"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL-friendly. Leave blank to auto-generate.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows="2"
                  placeholder="Short description"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => handleChange('image', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => handleChange('displayOrder', e.target.value)}
                  min="0"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-bg text-gray-800 dark:text-white text-sm sm:text-base"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
                />
                <label htmlFor="isActive" className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Active (visible to customers)
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? 'Saving...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// CATEGORY CARD
// ============================================================
const CategoryCard = ({ category, onEdit, onDelete, deleting }) => (
  <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
              {category.name || 'Unnamed'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 font-mono truncate">
              /{category.slug || 'no-slug'}
            </p>
            {category.description && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                {category.description}
              </p>
            )}
            <span className="text-xs text-gray-400 mt-1 inline-block">
              Order: {category.displayOrder ?? 0}
            </span>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(category)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(category)}
              disabled={deleting}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
              aria-label="Delete"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-2">
          <span
            className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
              category.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {category.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default CategoryManagement;