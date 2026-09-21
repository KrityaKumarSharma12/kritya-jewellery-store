import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const SubcategoryManagement = () => {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    isActive: true,
  });

  const fetchSubcategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/subcategories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubcategories(response.data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchSubcategories();
    fetchCategories();
  }, [fetchSubcategories, fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingSubcategory 
        ? `http://localhost:5000/api/admin/subcategories/${editingSubcategory.id}`
        : 'http://localhost:5000/api/admin/subcategories';
      
      await axios({
        method: editingSubcategory ? 'put' : 'post',
        url,
        data: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowModal(false);
      setEditingSubcategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        categoryId: '',
        isActive: true,
      });
      fetchSubcategories();
    } catch (error) {
      console.error('Error saving subcategory:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/subcategories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchSubcategories();
      } catch (error) {
        console.error('Error deleting subcategory:', error);
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Subcategories
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage product subcategories
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingSubcategory(null);
            setFormData({
              name: '',
              slug: '',
              description: '',
              categoryId: '',
              isActive: true,
            });
            setShowModal(true);
          }}
          className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Subcategory
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search subcategories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Slug</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Category</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {subcategories
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-none">
                        {sub.name}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 truncate max-w-[140px] sm:max-w-none">
                        {sub.slug}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 truncate max-w-[140px] sm:max-w-none">
                        {getCategoryName(sub.categoryId)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sub.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex gap-1 sm:gap-2">
                          <button 
                            onClick={() => {
                              setEditingSubcategory(sub);
                              setFormData(sub);
                              setShowModal(true);
                            }}
                            className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            aria-label="Edit subcategory"
                          >
                            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                            aria-label="Delete subcategory"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold truncate">
                {editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  required
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Active</span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition text-gray-700 dark:text-gray-300 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  {editingSubcategory ? 'Update' : 'Create'} Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubcategoryManagement;