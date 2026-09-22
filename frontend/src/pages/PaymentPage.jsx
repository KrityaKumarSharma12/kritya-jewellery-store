import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Wallet, Truck, Check, 
  Shield, Gem, Award, Package, 
  DollarSign,  Info, 
 MapPin, Phone, Tag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    clearCart, 
    getTotalItems,
    getPriceBreakdown,
    settings,
    // ⭐ Coupon state from CartContext
    appliedCoupon,
    removeCoupon,
  } = useCart();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showDetails, setShowDetails] = useState(true);
  const [formData, setFormData] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    notes: '',
  });
  const [error, setError] = useState('');

  // Re-sync form when user profile loads/changes
  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      address: prev.address || user.address || '',
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  const breakdown = getPriceBreakdown();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ============== LOAD RAZORPAY SCRIPT ==============
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // ============== VERIFY PAYMENT WITH BACKEND ==============
  const verifyPayment = async (rzpResponse, internalOrderId) => {
    const verifyRes = await axios.post(
      'http://localhost:5000/api/payment/verify',
      {
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
        internalOrderId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return verifyRes.data;
  };

  // ============== HANDLE SUBMIT ==============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.address) {
      setError('Please enter your shipping address');
      setLoading(false);
      return;
    }

    if (!formData.phone) {
      setError('Please enter your phone number');
      setLoading(false);
      return;
    }

    try {
      // 1. Create the internal Order + OrderItems
      // ⭐ Include couponCode so the backend can apply the discount
      const orderData = {
        shippingAddress: formData.address,
        phone: formData.phone,
        paymentMethod: paymentMethod,
        notes: formData.notes,
        couponCode: appliedCoupon?.code || null,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product?.price || 0
        })),
        subtotal: breakdown.subtotal,
        discount: breakdown.discount,
        tax: breakdown.tax,
        shippingCost: breakdown.shipping,
        total: breakdown.total,
      };

      const response = await axios.post(
        'http://localhost:5000/api/orders',
        orderData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const internalOrderId = response.data.order?.id;

      if (!internalOrderId) {
        throw new Error('Order was not created — no order id returned');
      }

      // ============== COD: original flow ==============
      if (paymentMethod === 'COD') {
        await clearCart();
        removeCoupon();       // ⭐ clear coupon after successful order
        toast.success('Order placed successfully! 🎉');
        navigate('/profile', {
          state: { orderSuccess: true, orderId: internalOrderId },
        });
        return;
      }

      // ============== RAZORPAY FLOW (CARD, UPI, NETBANKING) ==============

      // 2. Load the Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load Razorpay. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 3. Ask backend to create a Razorpay order for this internal order
      const rzpOrderRes = await axios.post(
        'http://localhost:5000/api/payment/create-order',
        { orderId: internalOrderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorpayOrderId, amount, currency, keyId } = rzpOrderRes.data;

      // 4. Open the Razorpay modal
      const options = {
        key: keyId,
        amount,
        currency,
        name: "Kritya's Jewellery",
        description: `Order #${internalOrderId.slice(0, 8)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: formData.phone,
        },
        notes: {
          internalOrderId,
          address: formData.address,
          couponCode: appliedCoupon?.code || '',
        },
        theme: { color: '#D4AF37' },

        handler: async (rzpResponse) => {
          try {
            const verification = await verifyPayment(rzpResponse, internalOrderId);

            if (verification.success) {
              await clearCart();
              removeCoupon();       // ⭐ clear coupon after successful payment
              toast.success('Payment successful! 🎉');
              navigate('/profile', {
                state: { orderSuccess: true, orderId: internalOrderId },
              });
            } else {
              setError('Payment verification failed. Please contact support.');
              setLoading(false);
            }
          } catch (err) {
            console.error('Verification error:', err);
            setError(
              err.response?.data?.message ||
              'Payment verification failed. Please contact support.'
            );
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', (failResponse) => {
        console.error('Razorpay payment failed:', failResponse.error);
        setError(
          failResponse.error?.description ||
          'Payment failed. Please try again.'
        );
        setLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      setError(
        error.response?.data?.message ||
        error.message ||
        'Payment failed. Please try again.'
      );
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/products', {replace: true});
    return null;
  }

  const paymentMethods = settings?.paymentMethods || ['COD', 'CARD', 'UPI', 'NETBANKING'];

  const paymentMethodConfig = {
    COD: { 
      label: 'Cash on Delivery', 
      description: 'Pay when you receive your order',
      icon: Truck 
    },
    CARD: { 
      label: 'Credit/Debit Card', 
      description: 'Pay securely with Razorpay',
      icon: CreditCard 
    },
    UPI: { 
      label: 'UPI', 
      description: 'Pay via UPI with Razorpay',
      icon: Wallet 
    },
    NETBANKING: { 
      label: 'Net Banking', 
      description: 'Pay via Net Banking with Razorpay',
      icon: DollarSign 
    },
  };

  return (
    <div className="container-custom py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800 text-sm sm:text-base">
                {error}
              </div>
            )}

            {/* Shipping Address */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0" /> Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
                    placeholder="Enter your full shipping address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
                    placeholder="Any special instructions for your order..."
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0" /> Payment Method
              </h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const config = paymentMethodConfig[method];
                  if (!config) return null;
                  const Icon = config.icon;
                  
                  return (
                    <label 
                      key={method}
                      className={`flex items-center p-3 sm:p-4 border rounded-lg cursor-pointer transition ${
                        paymentMethod === method 
                          ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/20' 
                          : 'border-gray-300 dark:border-dark-border hover:border-gold-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-gold-600 focus:ring-gold-500 flex-shrink-0"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mr-2 flex-shrink-0" />
                          <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-white truncate">{config.label}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{config.description}</p>
                      </div>
                      {paymentMethod === method && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary with Full Breakdown */}
        <div className="min-w-0">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 sm:p-6 lg:sticky lg:top-20">
            <h2 className="text-lg sm:text-xl font-playfair font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">Order Summary</h2>

            {/* ⭐ Applied Coupon Chip */}
            {appliedCoupon && (
              <div className="mb-5 flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="h-4 w-4 text-green-600 flex-shrink-0" />
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
              </div>
            )}
            
            {/* Items List */}
            <div className="space-y-3 max-h-64 overflow-y-auto mb-6 pr-2">
              {cartItems.map((item) => (
                <div key={item.id || item.productId} className="flex gap-3 py-2 border-b border-gray-100 dark:border-dark-border">
                  <img
                    src={
                      item.product?.images?.[0] ||
                      item.product?.colorMedia?.[0]?.url ||
                      '/api/placeholder/50/50'
                    }
                    alt={item.product?.name}
                    className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/api/placeholder/50/50';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white line-clamp-1">
                      {item.product?.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-gold-600 whitespace-nowrap">
                    ₹{(item.product?.price || 0) * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center gap-2 text-sm sm:text-base">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal ({getTotalItems()} items)
                </span>
                <span className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                  ₹{breakdown.subtotal.toFixed(2)}
                </span>
              </div>

              {/* ⭐ Discount Line */}
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
              
              <div className="flex justify-between items-center gap-2 text-sm sm:text-base">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    GST ({breakdown.taxRate}%)
                  </span>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Toggle detailed price breakdown"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                  ₹{breakdown.tax.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center gap-2 text-sm sm:text-base">
                <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                {breakdown.isFreeShipping ? (
                  <span className="font-semibold text-green-600 whitespace-nowrap">FREE</span>
                ) : (
                  <span className="font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                    ₹{breakdown.shipping.toFixed(2)}
                  </span>
                )}
              </div>
              
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
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gold-600 hover:bg-gold-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {loading 
                ? 'Processing...' 
                : paymentMethod === 'COD' 
                  ? 'Place Order' 
                  : `Pay ₹${breakdown.total.toFixed(2)}`}
            </button>

            <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Package className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Easy Returns</span>
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

export default PaymentPage;