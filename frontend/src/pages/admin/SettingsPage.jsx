import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Save, RefreshCw, Percent, CreditCard,
  Bell, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const SettingsPage = () => {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    storeName: "Kritya's Jewellery",
    storeEmail: "info@kritiyasjewellery.com",
    storePhone: "+91 98765 43210",
    storeAddress: "123 Jewellery Lane, Mumbai, India",
    currency: "INR",
    taxRate: 3,
    shippingCost: 0,
    freeShippingAbove: 5000,
    paymentMethods: ['COD', 'CARD', 'UPI', 'NETBANKING'],
    notificationEmail: true,
    notificationSMS: false,
    returnDays: 7,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('http://localhost:5000/api/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const SettingSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gold-600 flex-shrink-0" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center px-4">
          <RefreshCw className="h-10 w-10 sm:h-12 sm:w-12 text-gold-600 animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-playfair font-bold text-gray-800 dark:text-white truncate">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Configure your store settings
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 text-sm sm:text-base flex-shrink-0"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* General Settings */}
        <SettingSection title="General Settings" icon={Settings}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Email
              </label>
              <input
                type="email"
                value={settings.storeEmail}
                onChange={(e) => setSettings({...settings, storeEmail: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Phone
              </label>
              <input
                type="text"
                value={settings.storePhone}
                onChange={(e) => setSettings({...settings, storePhone: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Address
              </label>
              <textarea
                value={settings.storeAddress}
                onChange={(e) => setSettings({...settings, storeAddress: e.target.value})}
                rows="2"
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </SettingSection>

        {/* Tax & Shipping */}
        <SettingSection title="Tax & Shipping" icon={Percent}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={settings.taxRate}
                onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping Cost (₹)
              </label>
              <input
                type="number"
                value={settings.shippingCost}
                onChange={(e) => setSettings({...settings, shippingCost: parseFloat(e.target.value)})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Free Shipping Above (₹)
              </label>
              <input
                type="number"
                value={settings.freeShippingAbove}
                onChange={(e) => setSettings({...settings, freeShippingAbove: parseFloat(e.target.value)})}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
              />
            </div>
          </div>
        </SettingSection>

        {/* Payment Methods */}
        <SettingSection title="Payment Methods" icon={CreditCard}>
          <div className="space-y-3">
            {['COD', 'CARD', 'UPI', 'NETBANKING'].map((method) => (
              <label key={method} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods?.includes(method) || false}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSettings({...settings, paymentMethods: [...(settings.paymentMethods || []), method]});
                    } else {
                      setSettings({...settings, paymentMethods: (settings.paymentMethods || []).filter(m => m !== method)});
                    }
                  }}
                  className="h-4 w-4 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
                />
                <span className="font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {method === 'COD' ? 'Cash on Delivery' : 
                   method === 'CARD' ? 'Credit/Debit Card' :
                   method === 'UPI' ? 'UPI' : 'Net Banking'}
                </span>
              </label>
            ))}
          </div>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications" icon={Bell}>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-3">
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Email Notifications
              </span>
              <input
                type="checkbox"
                checked={settings.notificationEmail}
                onChange={(e) => setSettings({...settings, notificationEmail: e.target.checked})}
                className="h-5 w-5 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg gap-3">
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                SMS Notifications
              </span>
              <input
                type="checkbox"
                checked={settings.notificationSMS}
                onChange={(e) => setSettings({...settings, notificationSMS: e.target.checked})}
                className="h-5 w-5 text-gold-600 rounded focus:ring-gold-500 flex-shrink-0"
              />
            </label>
          </div>
        </SettingSection>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-red-600 truncate">
            Danger Zone
          </h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-800 dark:text-white">
                Clear All Data
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                This will permanently delete all store data
              </p>
            </div>
            <button className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-xs sm:text-sm flex-shrink-0">
              Clear Data
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="min-w-0">
              <p className="font-medium text-sm sm:text-base text-gray-800 dark:text-white">
                Delete Store
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                This will permanently delete your entire store
              </p>
            </div>
            <button className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-xs sm:text-sm flex-shrink-0">
              Delete Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;