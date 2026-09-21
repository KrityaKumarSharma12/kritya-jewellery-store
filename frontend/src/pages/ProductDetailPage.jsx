import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, ShoppingCart, Minus, Plus, Heart, Share2,
  Truck, Shield, Gem, Sparkles, Info, 
  ChevronDown, ChevronUp, Maximize2, ChevronLeft, ChevronRight,
  MessageCircle, Ruler, Award, Package, RefreshCw, X, Loader2,
  Calculator, TrendingUp, Percent, Zap
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const [selectedMetal, setSelectedMetal] = useState(14);
  const [selectedColor, setSelectedColor] = useState('Rose');
  const [selectedSize, setSelectedSize] = useState('US 6');

  const [dynamicPrice, setDynamicPrice] = useState(null);
  
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isAuthenticated } = useAuth();

  // ============== FETCH PRODUCT ==============
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/products/${id}`);
      const productData = response.data;
      setProduct(productData);

      const firstVariant = productData.variants?.[0];
      if (firstVariant) {
        setSelectedMetal(firstVariant.metalKarat || 18);
        setSelectedColor(firstVariant.metalColor || 'Yellow');
        setSelectedSize(firstVariant.productSize || 'US 6');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // ⭐ Reset active image index when color changes
  useEffect(() => {
    setActiveImage(0);
  }, [selectedColor]);

  // ============== FETCH DYNAMIC PRICE ==============
  const fetchDynamicPrice = useCallback(async () => {
    if (!product) return;
    
    try {
      setPriceLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/products/${id}/calculate-price`,
        {
          params: {
            metalKarat: selectedMetal,
            size: selectedSize,
            metalColor: selectedColor,
            quantity: quantity,
          }
        }
      );
      setDynamicPrice(response.data);
    } catch (error) {
      console.error('Error fetching dynamic price:', error);
    } finally {
      setPriceLoading(false);
    }
  }, [id, selectedMetal, selectedColor, selectedSize, quantity, product]);

  useEffect(() => {
    fetchDynamicPrice();
  }, [fetchDynamicPrice]);

  // ============== HANDLERS ==============
  const handleQuantityChange = (type) => {
    if (type === 'increase' && quantity < (product?.stock || 10)) {
      setQuantity(quantity + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity, dynamicPrice?.variantId);
      toast.success('Added to cart! 🎉');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity, dynamicPrice?.variantId);
      navigate('/cart');
    } catch (error) {
      toast.error('Failed to proceed');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
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

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hi, I'm interested in ${product?.name} (SKU: ${product?.sku}). Can you help me?`;
    window.open(`https://wa.me/919120219781?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ============== LOADING ==============
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg px-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Product not found</h2>
          <Link to="/products" className="text-gold-600 hover:text-gold-700 mt-4 inline-block">
            Back to Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ============== PREPARE DATA ==============
  const stock = product.stock || 10;
  const breakdown = dynamicPrice?.breakdown;
  const goldRate = dynamicPrice?.goldRate;
  const weightData = dynamicPrice?.weight;

  // ⭐ Build color → images map
  const colorMediaMap = {};
  (product.colorMedia || []).forEach((m) => {
    if (m.type === 'video') return;
    if (!colorMediaMap[m.color]) colorMediaMap[m.color] = [];
    colorMediaMap[m.color].push(m.url);
  });

  // ⭐ Combine: selected color's images first, then other colors' images
  const selectedColorImages = colorMediaMap[selectedColor] || [];
  const otherColorImages = (product.colorMedia || [])
    .filter((m) => m.type !== 'video' && m.color !== selectedColor)
    .map((m) => m.url);
  const combinedMediaImages = [...new Set([...selectedColorImages, ...otherColorImages])];

  // Fall back to product.images if no colorMedia at all
  const fallbackImages = product.images?.length > 0 ? product.images : ['/api/placeholder/600/600'];
  const images = combinedMediaImages.length > 0 ? combinedMediaImages : fallbackImages;

  const colorOptions = [
    { name: 'Rose', label: 'Rose Gold', color: '#E8B4B8' },
    { name: 'Yellow', label: 'Yellow Gold', color: '#FFD700' },
    { name: 'White', label: 'White Gold', color: '#E5E5E5' },
  ];

  const sizeOptions = ['US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10'];

  // ⭐ Build karat list from variants
  const availableKarats = Array.from(
    new Set(
      (product.variants || [])
        .map((v) => v.metalKarat)
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);

  // ⭐ Build color list from variants (fallback to all three)
  const availableColors = Array.from(
    new Set(
      (product.variants || [])
        .map((v) => v.metalColor)
        .filter(Boolean)
    )
  );
  const visibleColors = availableColors.length > 0
    ? colorOptions.filter((c) => availableColors.includes(c.name))
    : colorOptions;

  return (
    <div className="bg-white dark:bg-dark-bg min-h-screen">
      <div className="container-custom py-4 sm:py-6 lg:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap pb-1">
          <Link to="/" className="hover:text-gold-600 flex-shrink-0">HOME</Link>
          <span className="flex-shrink-0">/</span>
          <Link to="/products" className="hover:text-gold-600 uppercase flex-shrink-0">
            {product.category || 'JEWELLERY'}
          </Link>
          <span className="flex-shrink-0">/</span>
          <span className="text-gray-800 dark:text-white uppercase truncate">
            {product.subCategory || product.name}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* ============== LEFT: IMAGE GALLERY ============== */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)]">
            {/* Thumbnails: horizontal on mobile, vertical on sm+ */}
            <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 sm:w-20 flex-shrink-0 sm:overflow-y-auto sm:max-h-[calc(100vh-7rem)] sm:pr-1 order-2 sm:order-1 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0">
              {images.map((img, index) => (
                <button
                  key={`${index}-${img}`}
                  onClick={() => setActiveImage(index)}
                  className={`relative aspect-square w-14 sm:w-full rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${
                    activeImage === index 
                      ? 'border-gold-600 ring-2 ring-gold-200' 
                      : 'border-gray-200 dark:border-dark-border hover:border-gold-300'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`View ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/api/placeholder/100/100'; }}
                  />
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0 order-1 sm:order-2">
              <div className="relative bg-gray-50 dark:bg-dark-card rounded-2xl overflow-hidden aspect-square">
                <motion.img
                  key={`${selectedColor}-${activeImage}-${images[activeImage]}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={images[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-overflow"
                  onError={(e) => { e.target.src = '/api/placeholder/600/600'; }}
                />

                {product.isFeatured && (
                  <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-gold-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" /> Featured
                  </div>
                )}
                
                <button
                  onClick={() => setZoomImage(true)}
                  className="absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 sm:p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition hover:scale-110"
                  aria-label="Zoom image"
                >
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition hover:scale-110"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setActiveImage((prev) => (prev + 1) % images.length)}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition hover:scale-110"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-white/90 backdrop-blur-sm px-2.5 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {String(activeImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                  </span>
                  <div className="hidden xs:flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`rounded-full transition-all ${
                          i === activeImage 
                            ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-gold-600' 
                            : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-300 hover:bg-gold-400'
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============== RIGHT: PRODUCT INFO ============== */}
          <div className="min-w-0">
            {/* SKU, Wishlist, Share */}
            <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
              <span className="text-xs sm:text-sm text-gray-500 truncate">SKU: {product.sku || 'N/A'}</span>
              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <button 
                  onClick={handleWishlist}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-card rounded-full transition"
                  aria-label="Add to wishlist"
                >
                  <Heart 
                    className={`h-5 w-5 ${
                      isWishlisted(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'
                    }`} 
                  />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-card rounded-full transition"
                  aria-label="Share product"
                >
                  <Share2 className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h1>

            <p className="text-sm sm:text-base text-gold-600 italic mb-3 sm:mb-4">
              Radiant brilliance. Timeless promise.
            </p>

            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm text-gray-500">(24 reviews)</span>
            </div>

            {/* ============== DYNAMIC PRICE ============== */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col xs:flex-row xs:items-baseline xs:justify-between gap-2 xs:gap-0">
                <div className="flex items-baseline gap-3">
                  {priceLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-gold-600" />
                      <span className="text-sm text-gray-500">Calculating...</span>
                    </div>
                  ) : (
                    <motion.span
                      key={dynamicPrice?.price}
                      initial={{ scale: 0.95, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl sm:text-3xl font-bold text-gold-600"
                    >
                      {dynamicPrice?.priceDisplay || `₹${product.price?.toLocaleString() || 0}`}
                    </motion.span>
                  )}
                </div>
                <button
                  onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                  className="text-xs sm:text-sm text-gold-600 hover:text-gold-700 flex items-center gap-1 font-medium self-start xs:self-auto"
                >
                  See Price Breakup 
                  {showPriceBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>

              {goldRate && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 flex-wrap">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {goldRate.karat}K Gold: ₹{goldRate.ratePerGram}/g
                  </span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-green-600">Live</span>
                </div>
              )}

              {/* ============== PRICE BREAKUP PANEL ============== */}
              <AnimatePresence>
                {showPriceBreakdown && breakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 p-3 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-card dark:to-dark-bg rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border"
                  >
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600" />
                      <h4 className="font-playfair font-bold text-base sm:text-lg text-gray-800 dark:text-white">
                        Price Breakdown
                      </h4>
                    </div>

                    {goldRate && (
                      <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 rounded-lg border border-gold-200 dark:border-gold-800">
                        <div className="flex justify-between items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium text-gold-700 dark:text-gold-400 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
                            Live {goldRate.karat}KT Gold Rate
                          </span>
                          <span className="font-bold text-gold-700 dark:text-gold-400 text-sm sm:text-base whitespace-nowrap">
                            ₹{goldRate.ratePerGram}/g
                          </span>
                        </div>
                        <p className="text-xs text-gold-600 dark:text-gold-500 mt-1">
                          Purity: {goldRate.purity}% · Updated live
                        </p>
                      </div>
                    )}

                    {weightData && (
                      <div className="mb-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                            Metal Weight
                          </span>
                          <span className="font-bold text-blue-900 dark:text-blue-200 text-sm sm:text-base whitespace-nowrap">
                            {weightData.display}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-blue-700 dark:text-blue-400">
                          <div className="flex justify-between">
                            <span>Weight:</span>
                            <span className="font-medium">{weightData.baseWeight}g</span>
                          </div>
                          <div className="border-t border-blue-200 dark:border-blue-800 pt-1.5 mt-1.5 flex justify-between font-bold">
                            <span>Final Weight:</span>
                            <span>{weightData.display}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 sm:p-4 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {breakdown.metal?.label || 'Metal'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                          {breakdown.metal?.amountDisplay || '₹0'}
                        </span>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs space-y-0.5">
                        <p className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Formula:</span>{' '}
                          <span className="font-mono">{breakdown.metal?.formula?.formula || 'Weight × Rate'}</span>
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 font-mono break-all">
                          {breakdown.metal?.formula?.calculation || ''}
                        </p>
                      </div>
                    </div>

                    {breakdown.gemstone?.amount > 0 && (
                      <div className="p-3 sm:p-4 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
                        <div className="flex justify-between items-center mb-2 gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {breakdown.gemstone.label || 'Gemstone'}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                            {breakdown.gemstone.amountDisplay || '₹0'}
                          </span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs">
                          <p className="text-gray-500 dark:text-gray-400 font-mono break-all">
                            {breakdown.gemstone.formula?.calculation || `${breakdown.gemstone.carat}ct × Rate/ct`}
                          </p>
                        </div>
                      </div>
                    )}

                    {breakdown.diamond?.amount > 0 && (
                      <div className="p-3 sm:p-4 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
                        <div className="flex justify-between items-center mb-2 gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {breakdown.diamond.label || 'Diamond'}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                            {breakdown.diamond.amountDisplay || '₹0'}
                          </span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs">
                          <p className="text-gray-500 dark:text-gray-400 font-mono break-all">
                            {breakdown.diamond.formula?.calculation || 'Based on product configuration'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-3 sm:p-4 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {breakdown.makingWastage?.label || 'Making & Wastage'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                          {breakdown.makingWastage?.totalDisplay || '₹0'}
                        </span>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs">
                        <p className="text-gray-500 dark:text-gray-400 font-mono break-all">
                          {breakdown.makingWastage?.formula?.calculation || 'Covers craftsmanship'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5 text-gold-600 flex-shrink-0" />
                          {breakdown.gst?.label || 'GST (3%)'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                          {breakdown.gst?.amountDisplay || '₹0'}
                        </span>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs">
                        <p className="text-gray-500 dark:text-gray-400 font-mono break-all">
                          {breakdown.gst?.formula?.calculation || ''}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-gradient-to-r from-gold-500 to-gold-700 rounded-lg mt-3 text-white shadow-md">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-base sm:text-lg">Grand Total</span>
                        <span className="font-bold text-xl sm:text-2xl whitespace-nowrap">
                          {dynamicPrice?.priceDisplay || `₹${product.price?.toLocaleString() || 0}`}
                        </span>
                      </div>
                    </div>

                    {quantity > 1 && (
                      <div className="mt-3 p-3 sm:p-4 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-dark-card dark:to-dark-bg rounded-lg border-2 border-gold-600">
                        <div className="flex justify-between items-center mb-2 gap-2">
                          <span className="font-bold text-white text-sm sm:text-base">
                            Total × {quantity} units
                          </span>
                          <span className="font-bold text-gold-400 text-lg sm:text-xl whitespace-nowrap">
                            {dynamicPrice?.pricing?.totalPriceDisplay || `₹${((dynamicPrice?.price || product.price || 0) * quantity).toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-200 dark:border-gold-800">
                      <p className="text-xs text-gold-700 dark:text-gold-400 text-center">
                        <Info className="h-3 w-3 inline mr-1" />
                        Price calculated in real-time based on live metal rates, selected karat, size & color
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ============== 1. METAL PURITY ============== */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">1. METAL PURITY</span>
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              </div>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {(availableKarats.length > 0 ? availableKarats : [9, 14, 18]).map((karat) => (
                  <button
                    key={karat}
                    onClick={() => setSelectedMetal(karat)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg border-2 transition font-medium text-sm sm:text-base ${
                      selectedMetal === karat
                        ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/20 text-gold-600'
                        : 'border-gray-200 dark:border-dark-border hover:border-gold-300 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {karat}KT
                  </button>
                ))}
              </div>
            </div>

            {/* ============== 2. COLOR ============== */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">2. COLOR</span>
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              </div>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {visibleColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition ${
                      selectedColor === c.name
                        ? 'border-gold-600 bg-gold-50 dark:bg-gold-900/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-gold-300'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ============== 3. JEWELLERY SIZE ============== */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">3. JEWELLERY SIZE</span>
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              </div>
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base"
                >
                  {sizeOptions.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center justify-center gap-2 text-gold-600 hover:text-gold-700 text-xs sm:text-sm font-medium whitespace-nowrap py-2 xs:py-0"
                >
                  <Ruler className="h-4 w-4 flex-shrink-0" /> Find Your Size
                </button>
              </div>
              {weightData && (
                <p className="text-xs text-gray-500 mt-2">
                  Estimated weight: <strong>{weightData.display}</strong> for {selectedSize}
                </p>
              )}
            </div>

            {/* SPECIFICATION BOX */}
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-dark-card rounded-xl mb-4 sm:mb-6">
              <div className="text-center">
                <Gem className="h-5 w-5 sm:h-6 sm:w-6 text-gold-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-800 dark:text-white">
                  {product.diamondCarat || '0.50'} CT
                </p>
                <p className="text-[10px] text-gray-500">Center Diamond</p>
              </div>
              <div className="text-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-gold-600 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-gold-600">
                  {product.diamondColor || 'D'}
                </div>
                <p className="text-[10px] text-gray-500">Colour</p>
              </div>
              <div className="text-center">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-gold-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-800 dark:text-white">
                  {product.diamondClarity || 'VS'}
                </p>
                <p className="text-[10px] text-gray-500">Clarity</p>
              </div>
              <div className="text-center">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-gold-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-800 dark:text-white">IGI</p>
                <p className="text-[10px] text-gray-500">Certified</p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-sm">
              {product.description || 'A delicate halo ring that enhances the center diamond with a circle of brilliance.'}
            </p>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gold-600 hover:text-gold-700 text-sm font-medium flex items-center gap-1 mb-4"
            >
              View Details
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 sm:mb-6 overflow-hidden"
                >
                  <div className="p-3 sm:p-4 bg-gray-50 dark:bg-dark-card rounded-lg grid grid-cols-1 xs:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-500">Metal:</span>{' '}
                      <span className="font-medium">{selectedColor} Gold {selectedMetal}KT</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>{' '}
                      <span className="font-medium">{weightData?.display || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>{' '}
                      <span className="font-medium">{selectedSize}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span>{' '}
                      <span className={`font-medium ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock > 0 ? `${stock} available` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center border border-gray-300 dark:border-dark-border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange('decrease')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-100 dark:hover:bg-dark-bg transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <span className="px-4 sm:px-6 py-2.5 sm:py-3 min-w-[50px] sm:min-w-[60px] text-center font-medium text-sm sm:text-base">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange('increase')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-100 dark:hover:bg-dark-bg transition disabled:opacity-40"
                    disabled={quantity >= stock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
                <span className="text-xs sm:text-sm text-gray-500">{stock} items available</span>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
              <button
                onClick={handleBuyNow}
                disabled={addingToCart || stock === 0}
                className="w-full bg-gold-600 hover:bg-gold-700 text-white font-bold py-3 sm:py-4 rounded-lg transition shadow-lg hover:shadow-xl text-base sm:text-lg disabled:opacity-50"
              >
                {addingToCart ? 'Processing...' : 'BUY NOW'}
              </button>
              
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || stock === 0}
                className="w-full border-2 border-gold-600 text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20 font-bold py-3 sm:py-4 rounded-lg transition text-base sm:text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                ADD TO CART
              </button>
              
              <button
                onClick={handleWhatsApp}
                className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold py-3 sm:py-4 rounded-lg transition flex items-center justify-center gap-2 text-base sm:text-lg"
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                WHATSAPP AN EXPERT
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1 sm:gap-2 pt-4 sm:pt-6 border-t border-gray-200 dark:border-dark-border">
              <div className="text-center">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-white">Delivery</p>
                <p className="text-[10px] text-gray-500">3-5 Days</p>
              </div>
              <div className="text-center">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-white">Certified</p>
                <p className="text-[10px] text-gray-500">IGI Diamond</p>
              </div>
              <div className="text-center">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-white">Returns</p>
                <p className="text-[10px] text-gray-500">7-Day</p>
              </div>
              <div className="text-center">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-white">Packaging</p>
                <p className="text-[10px] text-gray-500">Premium</p>
              </div>
              <div className="text-center">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-white">Exchange</p>
                <p className="text-[10px] text-gray-500">Lifetime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setZoomImage(false)}
          >
            <button
              onClick={() => setZoomImage(false)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              aria-label="Close zoom"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={images[activeImage]}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSizeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSizeGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-dark-card rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-playfair font-bold text-gray-800 dark:text-white">
                  Ring Size Guide
                </h3>
                <button
                  onClick={() => setShowSizeGuide(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition"
                  aria-label="Close size guide"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      <th className="text-left py-2 sm:py-3 px-2 font-semibold whitespace-nowrap">US Size</th>
                      <th className="text-left py-2 sm:py-3 px-2 font-semibold whitespace-nowrap">India Size</th>
                      <th className="text-left py-2 sm:py-3 px-2 font-semibold whitespace-nowrap">Diameter (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { us: 'US 5', india: '9', mm: '15.7' },
                      { us: 'US 6', india: '12', mm: '16.5' },
                      { us: 'US 7', india: '14', mm: '17.3' },
                      { us: 'US 8', india: '16', mm: '18.1' },
                      { us: 'US 9', india: '18', mm: '18.9' },
                    ].map((row) => (
                      <tr key={row.us} className="border-b border-gray-100 dark:border-dark-border">
                        <td className="py-2 px-2">{row.us}</td>
                        <td className="py-2 px-2">{row.india}</td>
                        <td className="py-2 px-2">{row.mm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={() => setShowSizeGuide(false)}
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetailPage;