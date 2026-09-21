import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PLACEHOLDER = '/api/placeholder/400/400';

const WishlistPage = () => {
  const { isAuthenticated } = useAuth();
  const {
    wishlist,
    loading,
    pendingIds,
    removeFromWishlist,
    clearWishlist,
  } = useWishlist();
  const { addToCart } = useCart();

  const [bulkBusy, setBulkBusy] = useState(false);

  const handleMoveToCart = async (item) => {
    try {
      await addToCart(item.productId, 1);
      await removeFromWishlist(item.productId);
      toast.success(`${item.product?.name || 'Item'} moved to cart`);
    } catch (err) {
      console.error('Move to cart error:', err);
      toast.error('Could not move item to cart');
    }
  };

  const handleRemove = async (item) => {
    await removeFromWishlist(item.productId);
    toast.success('Removed from wishlist');
  };

  const handleAddAllToCart = async () => {
    if (wishlist.length === 0) return;
    setBulkBusy(true);
    let added = 0;
    for (const item of wishlist) {
      try {
        await addToCart(item.productId, 1);
        await removeFromWishlist(item.productId);
        added++;
      } catch (err) {
        console.error('Add all — skipping', item.productId, err);
      }
    }
    setBulkBusy(false);
    if (added > 0) {
      toast.success(`${added} item${added > 1 ? 's' : ''} moved to cart`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Remove all items from your wishlist?')) return;
    await clearWishlist();
    toast.success('Wishlist cleared');
  };

  const renderImage = (item) => {
    const product = item.product;
    if (!product) return PLACEHOLDER;
    return (
      product.images?.[0] ||
      product.colorMedia?.[0]?.url ||
      PLACEHOLDER
    );
  };

  // ============== LOADING ==============
  if (loading && wishlist.length === 0) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your wishlist...</span>
        </div>
      </div>
    );
  }

  // ============== EMPTY ==============
  if (wishlist.length === 0) {
    return (
      <div className="container-custom py-8 sm:py-12">
        <Link
          to="/products"
          className="inline-flex items-center text-gold-600 hover:text-gold-700 mb-6 text-sm sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Continue Shopping
        </Link>

        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-rose-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-playfair font-bold text-gray-800 dark:text-white mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
              Tap the heart on any product to save it here for later.
            </p>
            <Link
              to="/products"
              className="inline-block bg-gold-600 hover:bg-gold-700 text-white px-6 py-3 rounded-lg font-semibold transition text-sm sm:text-base"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============== GRID ==============
  return (
    <div className="container-custom py-6 sm:py-8">
      <Link
        to="/products"
        className="inline-flex items-center text-gold-600 hover:text-gold-700 mb-4 sm:mb-6 text-sm sm:text-base"
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Continue Shopping
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-gray-800 dark:text-white">
            My Wishlist
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {wishlist.length} item{wishlist.length > 1 ? 's' : ''} saved
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddAllToCart}
            disabled={bulkBusy}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-50"
          >
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
            Add All to Cart
          </button>
          <button
            onClick={handleClearAll}
            disabled={bulkBusy}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-bg transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {wishlist.map((item) => {
          const product = item.product;
          const isPending = pendingIds.has(item.productId);
          const inStock = product ? (product.stock ?? 0) > 0 : true;
          const price = product?.price ?? 0;

          return (
            <div
              key={item.id || item.productId}
              className="group bg-white dark:bg-dark-card rounded-xl shadow-md hover:shadow-xl transition overflow-hidden border border-gray-100 dark:border-dark-border flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-50 dark:bg-dark-bg overflow-hidden">
                <Link to={product ? `/products/${product.id}` : '#'}>
                  <img
                    src={renderImage(item)}
                    alt={product?.name || 'Wishlist item'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = PLACEHOLDER;
                    }}
                  />
                </Link>

                {/* Remove X */}
                <button
                  onClick={() => handleRemove(item)}
                  disabled={isPending}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-dark-card/90 text-gray-500 hover:text-red-600 shadow transition disabled:opacity-50"
                  title="Remove from wishlist"
                  aria-label="Remove from wishlist"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>

                {!inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 bg-red-600 rounded">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-3 sm:p-4 flex flex-col flex-1">
                {product?.category && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 truncate">
                    {product.category}
                  </p>
                )}
                <Link
                  to={product ? `/products/${product.id}` : '#'}
                  className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white line-clamp-2 hover:text-gold-600 transition"
                >
                  {product?.name || 'Unknown product'}
                </Link>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-bold text-gold-600 whitespace-nowrap">
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                </div>

                {product && (
                  <p
                    className={`mt-1 text-xs ${
                      inStock ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {inStock
                      ? product.stock <= 5
                        ? `Only ${product.stock} left`
                        : 'In Stock'
                      : 'Out of Stock'}
                  </p>
                )}

                <div className="mt-3 sm:mt-4">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    disabled={!inStock || isPending}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Move to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isAuthenticated && (
        <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
          Your wishlist is saved on this device.{' '}
          <Link to="/login" className="text-gold-600 hover:text-gold-700 font-medium">
            Log in
          </Link>{' '}
          to sync it across devices.
        </p>
      )}
    </div>
  );
};

export default WishlistPage;