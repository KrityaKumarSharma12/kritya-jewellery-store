import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, Minus, Plus, ShoppingBag, ArrowLeft, 
  Truck, Shield, Gem, Award,
  CheckCircle, Tag, Ticket, X, RefreshCw,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CartPage = () => {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getTotalItems,
    getPriceBreakdown,
    isEligibleForFreeShipping,
    getAmountForFreeShipping,
    // ⭐ Coupon API
    appliedCoupon,
    couponError,
    availableCoupons,
    applyCoupon,
    removeCoupon,
    fetchAvailableCoupons,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [showOffers, setShowOffers] = useState(false);

  const breakdown = getPriceBreakdown();

  // Load available coupons once on mount
  useEffect(() => {
    fetchAvailableCoupons();
  }, [fetchAvailableCoupons]);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) return;

    setApplying(true);
    const result = await applyCoupon(couponInput.trim(), breakdown.subtotal);
    setApplying(false);

    if (result.success) {
      toast.success(`Coupon ${couponInput.trim().toUpperCase()} applied`);
      setCouponInput('');
    } else {
      toast.error(result.error || 'Invalid coupon');
    }
  };

  const handleApplyFromList = async (code) => {
    setApplying(true);
    const result = await applyCoupon(code, breakdown.subtotal);
    setApplying(false);

    if (result.success) {
      toast.success(`Coupon ${code} applied`);
      setShowOffers(false);
    } else {
      toast.error(result.error || 'Invalid coupon');
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Coupon removed');
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/payment');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag className="h-16 sm:h-20 w-16 sm:w-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800 dark:text-white mb-2">Your Cart is Empty</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">Browse our collection and find something special!</p>
          <Link to="/products" className="bg-gold-600 hover:bg-gold-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition inline-block text-sm sm:text-base">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-6 sm:py-8">
      <Link to="/products" className="inline-flex items-center text-gold-600 hover:text-gold-700 mb-4 sm:mb-6 text-sm sm:text-base">
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Continue Shopping
      </Link>

      <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-dark-border">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{getTotalItems()} items in your cart</p>
            </div>
            
            {cartItems.map((item) => (
              <div key={item.id || item.productId} className="p-4 sm:p-6 border-b border-gray-200 dark:border-dark-border last:border-b-0">
                <div className="flex gap-3 sm:gap-4">
                  <img
                    src={
                      item.product?.images?.[0] ||
                      item.product?.colorMedia?.[0]?.url ||
                      '/api/placeholder/150/150'
                    }
                    alt={item.product?.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/api/placeholder/150/150';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{item.product?.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{item.product?.category}</p>
                        <p className="text-base sm:text-lg font-bold text-gold-600 mt-1">₹{item.product?.price}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:text-red-700 transition flex-shrink-0 p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 mt-2">
                      <div className="flex items-center border border-gray-300 dark:border-dark-border rounded-lg self-start">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2.5 sm:px-3 py-1 hover:bg-gray-100 dark:hover:bg-dark-bg transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <span className="px-2.5 sm:px-3 py-1 min-w-[30px] text-center text-sm sm:text-base">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2.5 sm:px-3 py-1 hover:bg-gray-100 dark:hover:bg-dark-bg transition"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Total: ₹{(item.product?.price || 0) * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free Shipping Progress */}
          {!isEligibleForFreeShipping() && getAmountForFreeShipping() > 0 && (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start sm:items-center gap-2 text-blue-700 dark:text-blue-300">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-xs sm:text-sm">
                  Add <strong>₹{getAmountForFreeShipping().toFixed(2)}</strong> more for <strong>FREE Shipping</strong>!
                </span>
              </div>
              <div className="mt-2 h-1.5 sm:h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((breakdown.discountedSubtotal / breakdown.freeShippingAbove) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="min-w-0">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 sm:p-6 lg:sticky lg:top-20">
            <h2 className="text-lg sm:text-xl font-playfair font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Order Summary</h2>

            {/* ⭐ COUPON BOX */}
            <div className="mb-5">
              {!appliedCoupon ? (
                <>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-sm uppercase focus:outline-none focus:ring-2 focus:ring-gold-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={applying || !couponInput.trim()}
                      className="px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                    >
                      {applying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </form>

                  {/* Available offers toggle */}
                  {availableCoupons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOffers((v) => !v)}
                      className="mt-2 text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1"
                    >
                      <Ticket className="h-3 w-3" />
                      {showOffers ? 'Hide' : 'View'} available offers ({availableCoupons.length})
                    </button>
                  )}

                  {/* Available offers list */}
                  {showOffers && availableCoupons.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                      {availableCoupons.map((c) => {
                        const eligible =
                          !c.minOrder || breakdown.subtotal >= c.minOrder;
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 border border-dashed border-gray-300 dark:border-dark-border rounded-lg gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                {c.code}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {c.type === 'PERCENTAGE' && `${c.value}% off`}
                                {c.type === 'FIXED' && `₹${c.value} off`}
                                {c.type === 'FREE_SHIPPING' && 'Free shipping'}
                                {c.minOrder != null && ` · Min ₹${c.minOrder.toLocaleString('en-IN')}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={!eligible || applying}
                              onClick={() => handleApplyFromList(c.code)}
                              className="text-xs px-2.5 sm:px-3 py-1 rounded bg-gold-600 text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                            >
                              {eligible ? 'Apply' : 'Not eligible'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Error message */}
                  {couponError && (
                    <p className="mt-2 text-xs text-red-500">{couponError}</p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Ticket className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300 truncate">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {appliedCoupon.type === 'FREE_SHIPPING'
                          ? 'Free shipping applied'
                          : `You save ₹${breakdown.discount.toLocaleString('en-IN')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 text-green-700 hover:text-red-600 transition flex-shrink-0"
                    title="Remove coupon"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-3 mb-6">
              {/* Subtotal */}
              <div className="flex justify-between items-center gap-2 text-sm sm:text-base">
                <span className="text-gray-600 dark:text-gray-400">Subtotal ({getTotalItems()} items)</span>
                <span className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                  ₹{breakdown.subtotal.toFixed(2)}
                </span>
              </div>

              {/* ⭐ Discount */}
              {breakdown.discount > 0 && (
                <div className="flex justify-between items-center text-green-600 gap-2 text-sm sm:text-base">
                  <span className="flex items-center gap-1">
                    Discount
                    {breakdown.couponCode && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                        {breakdown.couponCode}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    − ₹{breakdown.discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between items-center gap-2 text-sm sm:text-base">
                <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                {breakdown.isFreeShipping ? (
                  <span className="font-semibold text-green-600 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle className="h-4 w-4" /> FREE
                  </span>
                ) : (
                  <span className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                    ₹{breakdown.shipping.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 dark:border-dark-border pt-3">
                <div className="flex justify-between text-base sm:text-lg gap-2">
                  <span className="font-bold text-gray-800 dark:text-white">Total</span>
                  <span className="font-bold text-gold-600 whitespace-nowrap">₹{breakdown.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Inclusive of all taxes
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-lg transition shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              Proceed to Checkout
            </button>

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                Please <Link to="/login" className="text-gold-600 hover:text-gold-700">login</Link> to checkout
              </p>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Truck className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Gem className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Certified</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Award className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;