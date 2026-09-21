import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const GoldRateManager = () => {
  const [goldRates, setGoldRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  // Removed: priceHistory (not used in this component)

  const { token } = useAuth();

  useEffect(() => {
    fetchGoldRates();
    // Removed: fetchPriceHistory (not used)
  }, []);

  const fetchGoldRates = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/pricing/gold-rates/history', {
        params: { days: 1 }
      });
      setGoldRates(response.data);
    } catch (error) {
      console.error('Error fetching gold rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoldRates = async () => {
    try {
      setUpdating(true);
      await axios.post(
        'http://localhost:5000/api/pricing/admin/update-gold-rates',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchGoldRates();
      alert('Gold rates updated successfully!');
    } catch (error) {
      console.error('Error updating gold rates:', error);
      alert('Failed to update gold rates');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAllPrices = async () => {
    try {
      setUpdating(true);
      await axios.post(
        'http://localhost:5000/api/pricing/admin/update-prices',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('All product prices updated successfully!');
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Failed to update prices');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-playfair font-bold">Gold Rate Management</h2>
        <div className="flex gap-3">
          <button
            onClick={handleUpdateGoldRates}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            Update Gold Rates
          </button>
          <button
            onClick={handleUpdateAllPrices}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition disabled:opacity-50"
          >
            <DollarSign className="h-4 w-4" />
            Update All Prices
          </button>
        </div>
      </div>

      {/* Current Gold Rates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-dark-card rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          ))
        ) : (
          goldRates.map((rate) => (
            <motion.div
              key={rate.karat}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-card rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{rate.karat}K Gold</p>
                  <p className="text-2xl font-bold text-gold-600">₹{rate.ratePerGram}</p>
                </div>
                <div className={`p-2 rounded-full ${
                  rate.ratePerGram > 6000 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {rate.ratePerGram > 6000 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Purity: {rate.purity}%</p>
              <p className="text-xs text-gray-400">Updated: {new Date(rate.updatedAt).toLocaleTimeString()}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Price History Chart Placeholder */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Gold Rate History (30 Days)</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-dark-bg rounded-lg">
          <p className="text-gray-500">Chart visualization coming soon</p>
        </div>
      </div>

      {/* Price Rules Section */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dynamic Pricing Rules</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <div>
              <p className="font-medium">Bulk Discount</p>
              <p className="text-sm text-gray-500">5% off for 5+ items, 10% off for 10+</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <div>
              <p className="font-medium">VIP Customer Group</p>
              <p className="text-sm text-gray-500">15% discount for premium members</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
            <div>
              <p className="font-medium">Happy Hour Pricing</p>
              <p className="text-sm text-gray-500">10% off between 6 PM - 9 PM</p>
            </div>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full">Scheduled</span>
          </div>
          <button className="text-gold-600 hover:text-gold-700 text-sm font-medium">
            + Add New Price Rule
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoldRateManager;