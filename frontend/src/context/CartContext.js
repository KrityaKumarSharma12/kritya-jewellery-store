import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // ⭐ Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);

  const { user, token } = useAuth();

  // Fetch store settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/settings/public');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings({
        taxRate: 3,
        shippingCost: 0,
        freeShippingAbove: 5000,
      });
    }
  }, []);

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
    if (user) {
      fetchCart();
    } else {
      const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
      setCartItems(guestCart);
    }
  }, [user, fetchCart, fetchSettings]);

  const fetchAvailableCoupons = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/coupons/available');
      setAvailableCoupons(response.data || []);
    } catch (error) {
      console.error('Error fetching available coupons:', error);
      setAvailableCoupons([]);
    }
  }, []);

  const applyCoupon = async (code, subtotalOverride) => {
    setCouponError('');

    const codeStr = (code || '').trim().toUpperCase();
    if (!codeStr) {
      setCouponError('Enter a coupon code');
      return { success: false, error: 'Enter a coupon code' };
    }

    const subtotal = typeof subtotalOverride === 'number'
      ? subtotalOverride
      : getSubtotal();

    try {
      const response = await axios.post(
        'http://localhost:5000/api/coupons/validate',
        { code: codeStr, subtotal },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      const { coupon, discount, freeShipping } = response.data;

      setAppliedCoupon({
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrder: coupon.minOrder,
        isGlobal: coupon.isGlobal,
        discount,
        freeShipping,
      });

      return { success: true, coupon, discount };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid coupon code';
      setCouponError(msg);
      setAppliedCoupon(null);
      return { success: false, error: msg };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const clearCartAndCoupon = async () => {
    await clearCart();
    removeCoupon();
  };

  const getDiscount = () => {
    if (!appliedCoupon) return 0;

    const subtotal = getSubtotal();
    if (subtotal <= 0) return 0;

    let discount = 0;

    if (appliedCoupon.type === 'PERCENTAGE') {
      discount = (subtotal * appliedCoupon.value) / 100;
      if (appliedCoupon.maxDiscount != null && discount > appliedCoupon.maxDiscount) {
        discount = appliedCoupon.maxDiscount;
      }
    } else if (appliedCoupon.type === 'FIXED') {
      discount = appliedCoupon.value;
    } else if (appliedCoupon.type === 'FREE_SHIPPING') {
      discount = 0;
    }

    if (discount > subtotal) discount = subtotal;
    return Math.round(discount * 100) / 100;
  };

  const hasFreeShippingFromCoupon = () => {
    return appliedCoupon?.type === 'FREE_SHIPPING';
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * (item.quantity || 0));
    }, 0);
  };

  // ✅ FIX: Extract GST that's already inside the price (inclusive model).
  const getTax = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxRate = settings?.taxRate || 3;
    if (discountedSubtotal <= 0) return 0;
    return discountedSubtotal - discountedSubtotal / (1 + taxRate / 100);
  };

  const getShipping = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const freeShippingAbove = settings?.freeShippingAbove || 5000;
    const shippingCost = settings?.shippingCost || 0;

    if (hasFreeShippingFromCoupon()) return 0;
    if (discountedSubtotal >= freeShippingAbove) return 0;
    return shippingCost;
  };

  // ✅ FIX: Do NOT add tax on top — price is GST-inclusive.
  const getTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const shipping = getShipping();
    return Math.max(0, subtotal - discount) + shipping;
  };

  const isEligibleForFreeShipping = () => {
    if (hasFreeShippingFromCoupon()) return true;
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const freeShippingAbove = settings?.freeShippingAbove || 5000;
    return discountedSubtotal >= freeShippingAbove;
  };

  const getAmountForFreeShipping = () => {
    if (hasFreeShippingFromCoupon()) return 0;
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const freeShippingAbove = settings?.freeShippingAbove || 5000;
    const remaining = freeShippingAbove - discountedSubtotal;
    return remaining > 0 ? remaining : 0;
  };

  // ✅ FIX: total = discountedSubtotal + shipping (no added tax).
  const getPriceBreakdown = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxRate = settings?.taxRate || 3;
    const tax = getTax();
    const shipping = getShipping();
    const total = discountedSubtotal + shipping;

    return {
      subtotal,
      discount,
      discountedSubtotal,
      couponCode: appliedCoupon?.code || null,
      couponType: appliedCoupon?.type || null,
      hasCoupon: !!appliedCoupon,
      taxRate,
      tax,
      shipping,
      total,
      isFreeShipping: shipping === 0,
      freeShippingAbove: settings?.freeShippingAbove || 5000,
      amountForFreeShipping: getAmountForFreeShipping(),
    };
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
      const existingItem = guestCart.find(item => item.productId === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        guestCart.push({ productId, quantity });
      }
      localStorage.setItem('guestCart', JSON.stringify(guestCart));
      setCartItems(guestCart);
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/cart',
        { productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!user) {
      const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
      const item = guestCart.find(item => item.productId === productId);
      if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
          const index = guestCart.indexOf(item);
          guestCart.splice(index, 1);
        }
        localStorage.setItem('guestCart', JSON.stringify(guestCart));
        setCartItems(guestCart);
      }
      return;
    }

    try {
      await axios.put(`http://localhost:5000/api/cart/${productId}`,
        { quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  const removeFromCart = async (productId) => {
    if (!user) {
      const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
      const filtered = guestCart.filter(item => item.productId !== productId);
      localStorage.setItem('guestCart', JSON.stringify(filtered));
      setCartItems(filtered);
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/cart/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = async () => {
    if (!user) {
      localStorage.removeItem('guestCart');
      setCartItems([]);
      return;
    }

    try {
      await axios.delete('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getTotalPrice = () => {
    return getTotal();
  };

  const value = {
    cartItems,
    loading,
    settings,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,

    appliedCoupon,
    couponError,
    availableCoupons,
    applyCoupon,
    removeCoupon,
    fetchAvailableCoupons,
    clearCartAndCoupon,

    getTotalItems,
    getTotalPrice,
    getSubtotal,
    getDiscount,
    getTax,
    getShipping,
    getTotal,
    getPriceBreakdown,
    isEligibleForFreeShipping,
    getAmountForFreeShipping,
    hasFreeShippingFromCoupon,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};