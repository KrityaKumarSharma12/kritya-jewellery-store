import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isAuthenticated } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    setIsAdding(true);
    try {
      // FIX: Pass the default variant if it exists
      const defaultVariant = product.variants?.[0] || null;
      await addToCart(product.id, 1, defaultVariant?.id || null);
      toast.success('Added to cart! 🎉');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }

    try {
      await toggleWishlist(product.id);
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  // Get the first variant or use product data
  const variant = product.variants?.[0] || product;
  
  // FIX: Handle price safely
  const price = product.price || variant.currentPrice || variant.basePrice || variant.priceData?.price || 0;
  const originalPrice = product.originalPrice || variant.originalPrice || variant.basePrice || price;
  const discount = product.discount || variant.discount || 0;
  const stock = variant.stock || product.stock || 0;

  return (
    <div className="group relative bg-white dark:bg-dark-card rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        {product.isFeatured && (
          <span className="bg-gold-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
        {product.isNewArrival && (
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            New Arrival
          </span>
        )}
        {product.isBestSeller && (
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Best Seller
          </span>
        )}
        {discount > 0 && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            -{discount}% OFF
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Heart
          className={`h-5 w-5 transition-all ${
            isWishlisted(product.id) 
              ? 'fill-red-500 text-red-500' 
              : 'text-gray-400 hover:text-red-500'
          }`}
        />
      </button>

      {/* Image */}
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative h-64 overflow-hidden bg-gray-100">
          <img
            src={product.images?.[0]?.url || product.images?.[0] || '/api/placeholder/400/400'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.target.src = '/api/placeholder/400/400'; }}
          />
          {stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg px-4 py-2 bg-red-600 rounded-lg">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-medium text-gold-600 bg-gold-50 dark:bg-gold-900/30 px-2 py-0.5 rounded">
            {product.category || 'Jewellery'}
          </span>
        </div>

        <Link to={`/products/${product.id}`}>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white hover:text-gold-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">(24)</span>
        </div>

        {/* Price */}
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gold-600">
              ₹{typeof price === 'number' ? price.toFixed(2) : price}
            </span>
            {originalPrice > price && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  ₹{typeof originalPrice === 'number' ? originalPrice.toFixed(2) : originalPrice}
                </span>
                <span className="text-xs font-semibold text-green-600">
                  {discount}% off
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-2 mt-1">
          {stock > 0 ? (
            <>
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-600">
                {stock > 10 ? 'In Stock' : `Only ${stock} left`}
              </span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-xs text-red-600">Out of Stock</span>
            </>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={stock === 0 || isAdding}
          className={`w-full mt-3 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            stock > 0 && !isAdding
              ? 'bg-gold-600 hover:bg-gold-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {isAdding ? 'Adding...' : stock > 0 ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;