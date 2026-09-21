import React, { useState } from 'react';
import { motion } from 'framer-motion';  // ← Add this import
import { X, Star, ShoppingCart, Minus, Plus } from 'lucide-react';

const QuickViewModal = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const images = product.images?.length > 0 ? product.images : ['/api/placeholder/600/600'];

  const handleQuantityChange = (type) => {
    if (type === 'increase' && quantity < (product.stock || 10)) {
      setQuantity(quantity + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-dark-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-dark-card rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="grid md:grid-cols-2 gap-8 p-6">
            {/* Images */}
            <div>
              <div className="relative h-96 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/600/600';
                  }}
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-20 rounded-lg overflow-hidden transition-all ${
                        selectedImage === index 
                          ? 'ring-2 ring-gold-600 ring-offset-2' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/200/200';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gold-600 bg-gold-50 dark:bg-gold-900/30 px-3 py-1 rounded-full">
                  {product.category}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.material}
                </span>
              </div>

              <h2 className="text-2xl font-playfair font-bold text-gray-800 dark:text-white">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating || 4) 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({product.reviews || 0} reviews)
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-bold text-gold-600 dark:text-gold-400">
                  ₹{product.price}
                </span>
                {product.originalPrice && (
                  <span className="ml-2 text-sm text-gray-400 line-through">
                    ₹{product.originalPrice}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {product.description || 'Beautiful handcrafted jewellery piece.'}
                </p>
              </div>

              {/* Stock Status */}
              <div className="mt-4 flex items-center gap-2">
                {product.stock > 0 ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {product.stock > 10 ? 'In Stock' : `Only ${product.stock} left`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-sm text-red-600 dark:text-red-400">Out of Stock</span>
                  </>
                )}
              </div>

              {/* Quantity */}
              {product.stock > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-300 dark:border-dark-border rounded-lg">
                      <button
                        onClick={() => handleQuantityChange('decrease')}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-card transition rounded-l-lg"
                      >
                        <Minus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </button>
                      <span className="px-4 py-2 min-w-[40px] text-center text-gray-800 dark:text-white">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange('increase')}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-card transition rounded-r-lg"
                      >
                        <Plus className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              )}

              {/* Product Features */}
              <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gold-600">✓</span>
                  Free Shipping
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gold-600">✓</span>
                  30-Day Returns
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gold-600">✓</span>
                  Secure Payment
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gold-600">✓</span>
                  Premium Quality
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickViewModal;