import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Package, Heart, Settings, LogOut, Mail, Phone, MapPin, Edit2, Check, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReturnRequestModal from '../components/ReturnRequestModal';

const CustomerProfilePage = () => {
  const { user, token, logout, updateUser } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null); // ⭐ which order the modal is open for
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  }, [user]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      const ordersArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];

      console.log('📦 Orders received in frontend:', ordersArray.length, ordersArray);
      setOrders(ordersArray);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  }, [token]);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/wishlist', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (location.state?.orderSuccess) {
      setActiveTab('orders');
    }
    fetchOrders();
    fetchWishlist();
  }, [location.state?.orderSuccess, fetchOrders, fetchWishlist]);

  const handleUpdateProfile = async () => {
    try {
      const response = await axios.put(
        'http://localhost:5000/api/users/profile',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser(response.data);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ⭐ Return status badge colors
  const getReturnStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      RECEIVED: 'bg-purple-100 text-purple-800',
      INSPECTING: 'bg-indigo-100 text-indigo-800',
      INSPECTED: 'bg-teal-100 text-teal-800',
      REFUNDED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ⭐ Safety helper — returns array even if backend didn't include it
  const getOrderReturns = (order) => {
    return Array.isArray(order?.returns) ? order.returns : [];
  };

  // ⭐ Can this order be returned right now?
  const canReturn = (order) => {
    if (!order || order.status !== 'DELIVERED') return false;
    const returns = getOrderReturns(order);
    // Hide button if there's any existing return in a non-terminal-rejected state
    // (REJECTED = don't allow re-request to prevent abuse)
    return returns.length === 0;
  };

  return (
    <div className="container-custom py-6 sm:py-8">
      <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-lg p-5 sm:p-6 md:sticky md:top-20">
            <div className="text-center mb-5 sm:mb-6">
              <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl sm:text-3xl font-playfair font-bold text-gold-600">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">{user?.name}</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{user?.email}</p>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm sm:text-base ${
                  activeTab === 'orders' ? 'bg-gold-100 text-gold-700' : 'hover:bg-gray-100'
                }`}
              >
                <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                My Orders
              </button>
              <button
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm sm:text-base ${
                  activeTab === 'wishlist' ? 'bg-gold-100 text-gold-700' : 'hover:bg-gray-100'
                }`}
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Wishlist
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm sm:text-base ${
                  activeTab === 'profile' ? 'bg-gold-100 text-gold-700' : 'hover:bg-gray-100'
                }`}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm sm:text-base ${
                  activeTab === 'settings' ? 'bg-gold-100 text-gold-700' : 'hover:bg-gray-100'
                }`}
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-red-600 hover:bg-red-50 text-sm sm:text-base"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Logout
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800 mb-4 sm:mb-6">My Orders</h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-600"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No orders yet</p>
                  <p className="text-xs sm:text-sm text-gray-500">Start shopping to see your orders here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const orderReturns = getOrderReturns(order);
                    const latestReturn = orderReturns[0]; // most recent
                    const showReturnButton = canReturn(order);

                    return (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-gray-500">Order #{order.id.slice(-8)}</p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-wrap">
                              <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                              {/* ⭐ Return status badge */}
                              {latestReturn && (
                                <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full ${getReturnStatusColor(latestReturn.status)}`}>
                                  {latestReturn.status === 'PENDING' && 'Return Pending'}
                                  {latestReturn.status === 'APPROVED' && 'Return Approved'}
                                  {latestReturn.status === 'RECEIVED' && 'Return Received'}
                                  {latestReturn.status === 'INSPECTING' && 'Inspecting'}
                                  {latestReturn.status === 'INSPECTED' && 'Inspected'}
                                  {latestReturn.status === 'REFUNDED' && 'Refunded'}
                                  {latestReturn.status === 'COMPLETED' && 'Completed'}
                                  {latestReturn.status === 'REJECTED' && 'Return Rejected'}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-sm sm:text-base text-gold-600 mt-1">₹{order.total}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 sm:gap-3">
                              <img
                                src={
                                  item.product?.images?.[0] ||
                                  item.product?.colorMedia?.[0]?.url ||
                                  '/api/placeholder/50/50'
                                }
                                alt={item.product?.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/api/placeholder/50/50';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium truncate">{item.product?.name}</p>
                                <p className="text-xs sm:text-sm text-gray-500">Qty: {item.quantity}</p>
                              </div>
                              <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">₹{item.price}</span>
                            </div>
                          ))}
                        </div>

                        {/* ⭐ Return button */}
                        {showReturnButton && (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => setReturnOrder(order)}
                              disabled={!!returnOrder}
                              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white text-xs sm:text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Return / Refund
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800 mb-4 sm:mb-6">Wishlist</h2>

              {wishlist.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">Your wishlist is empty</p>
                  <p className="text-xs sm:text-sm text-gray-500">Save your favourite items here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {wishlist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 sm:gap-4 p-3 border border-gray-200 rounded-lg">
                      <img
                        src={
                          item.product?.images?.[0] ||
                          item.product?.colorMedia?.[0]?.url ||
                          '/api/placeholder/80/80'
                        }
                        alt={item.product?.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/api/placeholder/80/80';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-800 truncate">{item.product?.name}</h4>
                        <p className="text-sm sm:text-base text-gold-600 font-bold">₹{item.product?.price}</p>
                        <button className="text-xs sm:text-sm text-gold-600 hover:text-gold-700">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800">Profile</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-gold-600 hover:text-gold-700 flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={handleUpdateProfile}
                    className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    Save
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-gray-100">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Full Name</p>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                      />
                    ) : (
                      <p className="font-medium text-sm sm:text-base truncate">{user?.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-gray-100">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Email</p>
                    <p className="font-medium text-sm sm:text-base truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-gray-100">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Phone</p>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                      />
                    ) : (
                      <p className="font-medium text-sm sm:text-base truncate">{user?.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 py-3">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Address</p>
                    {editing ? (
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        rows="3"
                        className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                      />
                    ) : (
                      <p className="font-medium text-sm sm:text-base">{user?.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800 mb-4 sm:mb-6">Settings</h2>

              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-800 mb-2">Change Password</h3>
                  <form className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm sm:text-base"
                    />
                    <button className="bg-gold-600 hover:bg-gold-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base">
                      Update Password
                    </button>
                  </form>
                </div>

                <div className="p-3 sm:p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-sm sm:text-base text-red-600 mb-2">Danger Zone</h3>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 rounded-lg transition text-sm sm:text-base">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⭐ Return modal — only mounts when an order is selected */}
      {returnOrder && (
        <ReturnRequestModal
          order={returnOrder}
          token={token}
          onClose={() => setReturnOrder(null)}
          onSuccess={() => {
            setReturnOrder(null);
            toast.success('Return request submitted');
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default CustomerProfilePage;