import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
// Removed: TrendingUp, TrendingDown, AlertCircle (not used)
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DynamicPrice = ({ product, quantity = 1, showBreakdown = false }) => {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [goldRate, setGoldRate] = useState(null);
  const { user } = useAuth();

  // Wrap fetchPrice in useCallback
  const fetchPrice = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        quantity,
        ...(user?.id && { customerId: user.id }),
      });
      
      const response = await axios.get(
        `http://localhost:5000/api/products/variant/${product.id}/price?${params}`
      );
      setPriceData(response.data);
      
      if (response.data.goldRate) {
        setGoldRate(response.data.goldRate);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      // Fallback to product price if available
      if (product.price) {
        setPriceData({
          price: product.price,
          originalPrice: product.originalPrice || product.price,
          discount: product.discount || 0,
          breakdown: {
            'Base Price': product.price,
            'Total': product.price,
          }
        });
      }
    } finally {
      setLoading(false);
    }
  }, [product.id, quantity, user?.id, product.price, product.originalPrice, product.discount]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  if (!priceData) {
    return (
      <div className="text-gray-500">
        Price unavailable
      </div>
    );
  }

  const currentPrice = priceData.price || priceData.finalPrice || 0;
  const originalPrice = priceData.originalPrice || currentPrice;
  const discounts = priceData.discounts || [];
  const hasDiscount = discounts.length > 0 || (originalPrice > currentPrice);

  return (
    <div className="space-y-2">
      {/* Main Price */}
      <div className="flex items-center gap-3">
        <motion.span
          key={currentPrice}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-bold text-gold-600 dark:text-gold-400"
        >
          ₹{typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}
        </motion.span>
        
        {hasDiscount && originalPrice > currentPrice && (
          <motion.span
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-sm text-gray-400 line-through"
          >
            ₹{typeof originalPrice === 'number' ? originalPrice.toFixed(2) : originalPrice}
          </motion.span>
        )}
        
        {hasDiscount && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full"
          >
            -{Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%
          </motion.span>
        )}
      </div>

      {/* Gold Rate Indicator */}
      {goldRate && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Gold Rate (22K):</span>
          <span className="font-medium">₹{goldRate.ratePerGram}/g</span>
        </div>
      )}

      {/* Total with Quantity */}
      {quantity > 1 && (
        <div className="text-sm text-gray-500">
          Total: ₹{(currentPrice * quantity).toFixed(2)} ({quantity} items)
        </div>
      )}

      {/* Toggle Details Button */}
      {showBreakdown && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1"
        >
          {showDetails ? 'Hide' : 'Show'} price breakdown
          <Zap className="h-3 w-3" />
        </button>
      )}

      {/* Price Breakdown */}
      <AnimatePresence>
        {showDetails && priceData.breakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 dark:bg-dark-card p-4 rounded-lg space-y-2 text-sm"
          >
            {Object.entries(priceData.breakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500">{key}</span>
                <span>₹{typeof value === 'number' ? value.toFixed(2) : value}</span>
              </div>
            ))}
            
            {discounts && discounts.length > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-dark-border pt-2">
                  <p className="font-semibold text-green-600">Discounts Applied</p>
                  {discounts.map((discount, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-500">{discount.name}</span>
                      <span className="text-green-600">-₹{discount.amount?.toFixed(2) || 0}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="border-t border-gray-200 dark:border-dark-border pt-2 font-bold">
              <div className="flex justify-between text-gold-600">
                <span>Final Price</span>
                <span>₹{typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicPrice;