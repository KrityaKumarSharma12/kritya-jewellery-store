import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DynamicProductConfigPanel from '../../components/admin/DynamicProductConfigPanel';

const BASE = 'http://localhost:5000/api/admin/dynamic-products';

const DynamicProductEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [header, setHeader] = useState({ loading: true, name: '', type: '' });

  const fetchHeader = useCallback(async () => {
    try {
      setHeader((h) => ({ ...h, loading: true }));
      const res = await axios.get(`${BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHeader({
        loading: false,
        name: res.data.product?.name || 'Dynamic Product',
        type: res.data.type || '',
      });
    } catch (err) {
      console.error('Fetch DP header error:', err);
      toast.error('Failed to load dynamic product');
      navigate('/admin/dynamic-products');
    }
  }, [id, token, navigate]);

  useEffect(() => { fetchHeader(); }, [fetchHeader]);

  if (header.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-start gap-3 sm:gap-4">
        <div className="min-w-0">
          <button
            onClick={() => navigate('/admin/dynamic-products')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gold-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to list
          </button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            {header.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {header.type.replace(/_/g, ' ')} configuration
          </p>
        </div>
      </div>

      {/* The reusable config panel */}
      <DynamicProductConfigPanel dynamicProductId={id} token={token} />
    </div>
  );
};

export default DynamicProductEditor;