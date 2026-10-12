import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Loader2, Sparkles, AlertCircle, Package,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = 'http://localhost:5000/api/admin/dynamic-products';

const DynamicProductsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend may return array directly or wrapped in { value: [...] }
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.value)
        ? res.data.value
        : [];
      setItems(data);
    } catch (err) {
      console.error('Fetch dynamic products error:', err);
      toast.error('Failed to load dynamic products');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Dynamic Products
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Configurable products (Haath Phool, Couple Bands, Bridal Sets)
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/products/add-product')}
          className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Create Dynamic Product
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 sm:py-12 bg-white dark:bg-dark-card rounded-2xl shadow-lg px-4">
          <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-2">
            No dynamic products configured yet
          </p>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-4">
            Create a product with jewelleryType = "Haath Phool" first, then link a dynamic configuration
          </p>
          <button
            onClick={() => navigate('/admin/products/add-product')}
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-5 py-2 rounded-lg transition text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" /> Create Product
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Components</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sizing Rules</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {items.map((dp) => (
                  <tr key={dp.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          {dp.product?.images?.[0] ? (
                            <img src={dp.product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 m-3 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                            {dp.product?.name || 'Untitled product'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {dp.product?.category || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400 whitespace-nowrap">
                        {dp.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {dp.componentCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {dp.sizingRuleCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          dp.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {dp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/dynamic-products/${dp.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((dp) => (
              <div
                key={dp.id}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {dp.product?.images?.[0] ? (
                      <img src={dp.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 m-3 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                      {dp.product?.name || 'Untitled'}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400">
                      {dp.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-500 dark:text-gray-400">
                    Components: <span className="font-medium text-gray-800 dark:text-white">{dp.componentCount}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Rules: <span className="font-medium text-gray-800 dark:text-white">{dp.sizingRuleCount}</span>
                  </div>
                </div>
                <Link
                  to={`/admin/dynamic-products/${dp.id}`}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium"
                >
                  <Edit className="h-4 w-4" /> Edit Configuration
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DynamicProductsPage;