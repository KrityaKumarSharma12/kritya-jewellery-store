import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, X, Gem } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const DiamondManagement = () => {
  const [diamonds, setDiamonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiamond, setEditingDiamond] = useState(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    shape: 'Round',
    carat: '',
    color: 'G',
    clarity: 'VS1',
    cut: 'Excellent',
    pricePerCarat: '',
    certification: 'IGI',
    isActive: true,
  });

  const shapes = ['Round', 'Princess', 'Emerald', 'Radiant', 'Oval', 'Pear', 'Marquise', 'Heart'];
  const colors = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const clarities = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
  const cuts = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
  const certifications = ['IGI', 'GIA', 'HRD', 'NGTC', 'Other'];

  const fetchDiamonds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/diamonds', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiamonds(response.data || []);
    } catch (error) {
      console.error('Error fetching diamonds:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDiamonds();
  }, [fetchDiamonds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingDiamond 
        ? `http://localhost:5000/api/admin/diamonds/${editingDiamond.id}`
        : 'http://localhost:5000/api/admin/diamonds';
      
      await axios({
        method: editingDiamond ? 'put' : 'post',
        url,
        data: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowModal(false);
      setEditingDiamond(null);
      setFormData({
        name: '',
        shape: 'Round',
        carat: '',
        color: 'G',
        clarity: 'VS1',
        cut: 'Excellent',
        pricePerCarat: '',
        certification: 'IGI',
        isActive: true,
      });
      fetchDiamonds();
    } catch (error) {
      console.error('Error saving diamond:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this diamond?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/diamonds/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchDiamonds();
      } catch (error) {
        console.error('Error deleting diamond:', error);
      }
    }
  };

  const getColorBadge = (color) => {
    const colors = {
      'D': 'bg-blue-100 text-blue-800',
      'E': 'bg-blue-50 text-blue-700',
      'F': 'bg-indigo-100 text-indigo-800',
      'G': 'bg-indigo-50 text-indigo-700',
      'H': 'bg-gray-100 text-gray-800',
      'I': 'bg-gray-50 text-gray-700',
      'J': 'bg-yellow-100 text-yellow-800',
    };
    return colors[color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Diamonds
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage diamond inventory
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingDiamond(null);
            setFormData({
              name: '',
              shape: 'Round',
              carat: '',
              color: 'G',
              clarity: 'VS1',
              cut: 'Excellent',
              pricePerCarat: '',
              certification: 'IGI',
              isActive: true,
            });
            setShowModal(true);
          }}
          className="w-full sm:w-auto bg-gold-600 hover:bg-gold-700 text-white px-3 sm:px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm flex-shrink-0"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Add Diamond
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search diamonds..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {diamonds
            .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((diamond) => (
              <div key={diamond.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition border-l-4 border-gold-500">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <Gem className="h-7 w-7 sm:h-8 sm:w-8 text-gold-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                        {diamond.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {diamond.shape} · {diamond.carat}ct
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => {
                        setEditingDiamond(diamond);
                        setFormData(diamond);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      aria-label="Edit diamond"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(diamond.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      aria-label="Delete diamond"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <div className="text-xs sm:text-sm min-w-0">
                    <span className="text-gray-500">Color:</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded whitespace-nowrap ${getColorBadge(diamond.color)}`}>
                      {diamond.color}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm min-w-0">
                    <span className="text-gray-500">Clarity:</span>
                    <span className="ml-2 font-medium">{diamond.clarity}</span>
                  </div>
                  <div className="text-xs sm:text-sm min-w-0">
                    <span className="text-gray-500">Cut:</span>
                    <span className="ml-2 font-medium">{diamond.cut}</span>
                  </div>
                  <div className="text-xs sm:text-sm min-w-0">
                    <span className="text-gray-500">Cert:</span>
                    <span className="ml-2 font-medium">{diamond.certification}</span>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-dark-border flex flex-wrap justify-between items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold text-gold-600 whitespace-nowrap">
                    ₹{diamond.pricePerCarat}/ct
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                    diamond.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {diamond.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-playfair font-bold truncate">
                {editingDiamond ? 'Edit Diamond' : 'Add Diamond'}
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

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shape *
                  </label>
                  <select
                    value={formData.shape}
                    onChange={(e) => setFormData({...formData, shape: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  >
                    {shapes.map(shape => (
                      <option key={shape} value={shape}>{shape}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carat *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.carat}
                    onChange={(e) => setFormData({...formData, carat: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color *
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  >
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Clarity *
                  </label>
                  <select
                    value={formData.clarity}
                    onChange={(e) => setFormData({...formData, clarity: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  >
                    {clarities.map(clarity => (
                      <option key={clarity} value={clarity}>{clarity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cut *
                  </label>
                  <select
                    value={formData.cut}
                    onChange={(e) => setFormData({...formData, cut: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  >
                    {cuts.map(cut => (
                      <option key={cut} value={cut}>{cut}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Per Carat (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerCarat}
                    onChange={(e) => setFormData({...formData, pricePerCarat: e.target.value})}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Certification
                  </label>
                  <select
                    value={formData.certification}
                    onChange={(e) => setFormData({...formData, certification: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-sm sm:text-base"
                  >
                    {certifications.map(cert => (
                      <option key={cert} value={cert}>{cert}</option>
                    ))}
                  </select>
                </div>
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
                  {editingDiamond ? 'Update' : 'Create'} Diamond
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiamondManagement;