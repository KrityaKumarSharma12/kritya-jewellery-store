import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Clock, Truck, Shield, Award, Quote, Star, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade, Mousewheel, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const API_BASE = 'http://localhost:5000/api';

const CountUp = ({ end, duration = 2000, suffix = '', prefix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasStarted(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let startTime = null;
    let animationFrame;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(end * easeOut);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
      else setCount(end);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, end, duration]);

  const formatNumber = (num) => {
    if (decimals > 0) return num.toFixed(decimals);
    return Math.floor(num).toLocaleString('en-IN');
  };

  return <span ref={ref}>{prefix}{formatNumber(count)}{suffix}</span>;
};

/* ---------- Section: Shop by Category ---------- */
const ShopByCategory = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/cms/categories?isActive=true`);
      return res.data.items || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const palette = ['#C9A227', '#B58B3A', '#8B2E4A', '#4A5D4E', '#C1662F', '#6B4E71'];
  const shadeFor = (seed = '') => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

  if (isLoading) {
    return (
      <section className="py-14 sm:py-16 lg:py-20 bg-white dark:bg-dark-bg">
        <div className="container-custom">
          <div className="h-7 sm:h-8 w-56 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-8 sm:mb-12 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = categories;
  if (!items.length) return null;

  const showArrows = items.length > 4;

  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-white dark:bg-dark-bg">
      <div className="container-custom">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600 mb-3">Explore</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-800 dark:text-white">
            Shop by Category
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            {showArrows
              ? `Scroll to explore all ${items.length} categories`
              : 'Find the perfect piece for every occasion'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation, Mousewheel, Keyboard]}
          navigation={showArrows}
          mousewheel={{ forceToAxis: true }}
          keyboard={{ enabled: true }}
          slidesPerView={1.15}
          spaceBetween={16}
          slidesPerGroup={1}
          watchOverflow
          breakpoints={{
            640:  { slidesPerView: 2.15, spaceBetween: 20 },
            768:  { slidesPerView: 3,    spaceBetween: 20 },
            1024: { slidesPerView: 4,    spaceBetween: 24 },
            1280: { slidesPerView: 4,    spaceBetween: 24 },
          }}
          className="categories-swiper !px-4 sm:!px-8 lg:!px-12 !pb-4"
        >
          {items.map((c) => (
            <SwiperSlide key={c.id || c._id || c.slug} className="!h-auto">
              <Link
                to={`/products?category=${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-dark-border hover:shadow-xl transition-all block"
              >
                <div
                  className="aspect-square w-full flex items-center justify-center"
                  style={!c.image ? { background: `linear-gradient(135deg, ${shadeFor(c.slug)}, #F5EFE3)` } : undefined}
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="font-playfair text-xl sm:text-2xl text-white/90 drop-shadow px-4 text-center">
                      {c.name}
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-5 pt-8 sm:pt-12">
                  <p className="font-playfair text-lg sm:text-xl md:text-2xl text-white drop-shadow-md leading-tight">
                    {c.name}
                  </p>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <style>{`
          .categories-swiper .swiper-button-prev,
          .categories-swiper .swiper-button-next {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 9999px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
            color: #C9A227;
            transition: all 0.2s;
            top: 50%;
            transform: translateY(-50%);
            margin-top: 0;
          }
          .categories-swiper .swiper-button-prev:hover,
          .categories-swiper .swiper-button-next:hover {
            background: #C9A227;
            color: #fff;
          }
          .categories-swiper .swiper-button-prev::after,
          .categories-swiper .swiper-button-next::after {
            font-size: 16px;
            font-weight: bold;
          }
          .categories-swiper .swiper-button-prev { left: 8px; }
          .categories-swiper .swiper-button-next { right: 8px; }
          .categories-swiper .swiper-button-disabled {
            opacity: 0.25;
            cursor: not-allowed;
          }
          @media (min-width: 640px) {
            .categories-swiper .swiper-button-prev,
            .categories-swiper .swiper-button-next {
              width: 44px;
              height: 44px;
            }
            .categories-swiper .swiper-button-prev::after,
            .categories-swiper .swiper-button-next::after {
              font-size: 18px;
            }
            .categories-swiper .swiper-button-prev { left: 16px; }
            .categories-swiper .swiper-button-next { right: 16px; }
          }
          .dark .categories-swiper .swiper-button-prev,
          .dark .categories-swiper .swiper-button-next {
            background: rgba(30, 30, 30, 0.95);
          }
          .dark .categories-swiper .swiper-button-prev:hover,
          .dark .categories-swiper .swiper-button-next:hover {
            background: #C9A227;
          }
        `}</style>
      </div>
    </section>
  );
};

/* ---------- Section: Collections Carousel ---------- */
const CollectionsCarousel = ({ collections = [] }) => {
  if (!collections.length) return null;

  const total = collections.length;
  const showArrows = total > 4;

  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-gray-50 dark:bg-dark-card/40">
      <div className="container-custom">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600 mb-3">Curated</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-800 dark:text-white">
            Shop the Collections
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            {total > 4 ? `Scroll to explore all ${total} collections` : 'Every mood. Every occasion.'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation, Mousewheel, Keyboard]}
          navigation={showArrows}
          mousewheel={{ forceToAxis: true }}
          keyboard={{ enabled: true }}
          slidesPerView={1.15}
          spaceBetween={16}
          slidesPerGroup={1}
          watchOverflow
          breakpoints={{
            640:  { slidesPerView: 2.15, spaceBetween: 20 },
            768:  { slidesPerView: 3,    spaceBetween: 20 },
            1024: { slidesPerView: 4,    spaceBetween: 24 },
            1280: { slidesPerView: 4,    spaceBetween: 24 },
          }}
          className="collections-swiper !px-4 sm:!px-8 lg:!px-12 !pb-4"
        >
          {collections.map((c) => (
            <SwiperSlide key={c.slug || c.id} className="!h-auto">
              <Link
                to={`/products?collection=${c.slug}`}
                className="group block rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
              >
                <div
                  className="aspect-[4/5] flex items-end p-4 sm:p-6 relative"
                  style={
                    !c.image
                      ? { background: `linear-gradient(160deg, ${c.color || '#C9A227'}, #1a1a1a)` }
                      : undefined
                  }
                >
                  {c.image && (
                    <>
                      <img
                        src={c.image}
                        alt={c.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    </>
                  )}
                  <div className="relative">
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/70">
                      Collection
                    </p>
                    <p className="font-playfair text-xl sm:text-2xl md:text-3xl text-white mt-1 drop-shadow">
                      {c.name}
                    </p>
                    <span className="inline-flex items-center text-white/90 text-xs sm:text-sm mt-2 sm:mt-3 group-hover:gap-2 transition-all">
                      Explore <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <style>{`
          .collections-swiper .swiper-button-prev,
          .collections-swiper .swiper-button-next {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 9999px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
            color: #C9A227;
            transition: all 0.2s;
            top: 42%;
          }
          .collections-swiper .swiper-button-prev:hover,
          .collections-swiper .swiper-button-next:hover {
            background: #C9A227;
            color: #fff;
          }
          .collections-swiper .swiper-button-prev::after,
          .collections-swiper .swiper-button-next::after {
            font-size: 16px;
            font-weight: bold;
          }
          .collections-swiper .swiper-button-prev { left: 8px; }
          .collections-swiper .swiper-button-next { right: 8px; }
          .collections-swiper .swiper-button-disabled {
            opacity: 0.25;
            cursor: not-allowed;
          }
          @media (min-width: 640px) {
            .collections-swiper .swiper-button-prev,
            .collections-swiper .swiper-button-next {
              width: 44px;
              height: 44px;
            }
            .collections-swiper .swiper-button-prev::after,
            .collections-swiper .swiper-button-next::after {
              font-size: 18px;
            }
            .collections-swiper .swiper-button-prev { left: 16px; }
            .collections-swiper .swiper-button-next { right: 16px; }
          }
          .dark .collections-swiper .swiper-button-prev,
          .dark .collections-swiper .swiper-button-next {
            background: rgba(30, 30, 30, 0.95);
          }
          .dark .collections-swiper .swiper-button-prev:hover,
          .dark .collections-swiper .swiper-button-next:hover {
            background: #C9A227;
          }
        `}</style>
      </div>
    </section>
  );
};

/* ---------- Section: Testimonials ---------- */
const Testimonials = ({ testimonials = [] }) => {
  if (!testimonials.length) return null;

  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-white dark:bg-dark-bg">
      <div className="container-custom">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600 mb-3">Loved by</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-800 dark:text-white">
            What Our Customers Say
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
            Real stories from real people
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.slice(0, 3).map((t, i) => (
            <div
              key={t.id || i}
              className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all relative"
            >
              <Quote className="absolute top-4 right-4 h-7 w-7 sm:h-8 sm:w-8 text-gold-200 dark:text-gold-900/40" />
              <div className="flex gap-1 text-gold-500">
                {Array.from({ length: t.rating || 5 }).map((_, k) => (
                  <Star key={k} className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" />
                ))}
              </div>
              <p className="mt-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                "{t.text}"
              </p>
              <p className="mt-5 text-sm font-semibold text-gray-800 dark:text-white">
                {t.name} {t.city && <span className="text-gray-400 font-normal">· {t.city}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------- Section: Editorial Banner ---------- */
const EditorialBanner = ({ editorial }) => {
  const data = editorial || {
    eyebrow: 'Our Story',
    heading: 'Heirlooms crafted with intention',
    body: 'Every Kritya piece begins as a sketch and ends as a memory. Our karigars shape each design by hand, using responsibly sourced gold and stones — so what you wear today becomes what your daughter treasures tomorrow.',
    ctaText: 'Read Our Story',
    ctaLink: '/about',
    imageUrl: null,
    statValue: '25+',
    statLabel: 'Years of Trust',
  };

  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-gradient-to-br from-gold-50 to-white dark:from-gold-950/20 dark:to-dark-bg">
      <div className="container-custom grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-16 items-center">
        <div className="order-2 md:order-1">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-600 mb-3">{data.eyebrow}</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-playfair font-bold text-gray-800 dark:text-white leading-tight">
            {data.heading}
          </h2>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            {data.body}
          </p>
          <Link
            to={data.ctaLink || '/about'}
            className="mt-6 sm:mt-8 inline-flex items-center bg-gold-600 hover:bg-gold-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {data.ctaText || 'Read Our Story'} <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </div>

        <div className="relative order-1 md:order-2">
          <div className="aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-gold-200/30">
            <img
              src={data.imageUrl || '/homepage/editorial.jpg'}
              alt={data.heading}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/kritya-hero-1.png';
              }}
            />
          </div>
          <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white dark:bg-dark-card rounded-2xl shadow-xl p-3 sm:p-5 hidden md:block border border-gold-100 dark:border-dark-border">
            <p className="font-playfair text-2xl sm:text-3xl font-bold text-gold-600">{data.statValue || '25+'}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {data.statLabel || 'Years of Trust'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const viewedBannersRef = useRef(new Set());

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/products?limit=12`);
      return response.data.products || response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---------- CMS DATA ----------
  const { data: collections = [] } = useQuery({
    queryKey: ['cms', 'collections'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/cms/collections`);
      return res.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ['cms', 'testimonials'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/cms/testimonials`);
      return res.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: editorial } = useQuery({
    queryKey: ['cms', 'editorial'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/cms/homepage/editorial`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (productsData) {
      setFeaturedProducts(productsData.slice(0, 4));
    }
  }, [productsData]);

  useEffect(() => {
    let cancelled = false;

    const fetchBanners = async () => {
      try {
        const res = await axios.get(`${API_BASE}/banners/live?position=HOME`);
        if (cancelled) return;

        const live = Array.isArray(res.data) ? res.data : [];

        if (live.length === 0) {
          setHeroSlides([
            {
              id: null,
              title: 'Elegant Jewellery for Every Moment',
              subtitle: 'Discover our exquisite collection of handcrafted jewellery',
              imageUrl: '/kritya-hero-1.png',
              buttonText: 'Shop Now',
              link: '/products',
            },
          ]);
          return;
        }

        setHeroSlides(
          live.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle,
            imageUrl: b.imageUrl,
            buttonText: b.buttonText || 'Shop Now',
            link: b.link || '/products',
          }))
        );

        live.forEach((b) => {
          if (!viewedBannersRef.current.has(b.id)) {
            viewedBannersRef.current.add(b.id);
            axios.post(`${API_BASE}/banners/${b.id}/view`).catch(() => {});
          }
        });
      } catch (err) {
        console.error('Failed to load banners:', err);
        if (cancelled) return;
        setHeroSlides([
          {
            id: null,
            title: 'Elegant Jewellery for Every Moment',
            subtitle: 'Discover our exquisite collection of handcrafted jewellery',
            imageUrl: '/kritya-hero-1.png',
            buttonText: 'Shop Now',
            link: '/products',
          },
        ]);
      }
    };

    fetchBanners();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Carousel */}
      <section className="relative h-[70vh] xs:h-[75vh] sm:h-[80vh] md:h-[85vh] lg:h-screen">
        {heroSlides.length > 0 && (
          <Swiper
            modules={[Autoplay, Pagination, Navigation, EffectFade]}
            effect="fade"
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            navigation
            className="h-full"
          >
            {heroSlides.map((slide, index) => (
              <SwiperSlide key={slide.id || index}>
                <div className="relative h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent md:from-black/40 md:via-black/20 md:to-transparent z-10" />
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/kritya-hero-1.png';
                    }}
                  />
                  <div className="absolute inset-0 z-20 flex items-center">
                    <div className="container-custom w-full">
                      <div className="max-w-2xl text-white">
                        <span className="inline-block bg-gold-600 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4">
                          <Sparkles className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                          New Collection
                        </span>
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-playfair font-bold mb-3 sm:mb-4 leading-tight">
                          {slide.title}
                        </h1>
                        {slide.subtitle && (
                          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-lg">
                            {slide.subtitle}
                          </p>
                        )}
                        <Link
                          to={slide.link}
                          onClick={() => {
                            if (slide.id) {
                              axios
                                .post(`${API_BASE}/banners/${slide.id}/click`)
                                .catch(() => {});
                            }
                          }}
                          className="inline-flex items-center bg-gold-600 hover:bg-gold-700 text-white px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          {slide.buttonText} <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {/* Features Bar */}
      <section className="py-8 sm:py-10 md:py-12 bg-white dark:bg-dark-card border-y border-gray-100 dark:border-dark-border">
        <div className="container-custom">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹5000' },
              { icon: Shield, label: 'Secure Payment', desc: '100% secure transactions' },
              { icon: Award, label: 'Premium Quality', desc: 'Handcrafted with care' },
              { icon: Clock, label: '24/7 Support', desc: 'Dedicated customer care' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-all group cursor-pointer"
              >
                <div className="p-2 sm:p-3 bg-gold-100 dark:bg-gold-900/30 rounded-full group-hover:bg-gold-600 transition-all flex-shrink-0">
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-gold-600 group-hover:text-white transition-all" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-14 sm:py-16 lg:py-20">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-8 sm:mb-10 lg:mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-800 dark:text-white">
                Featured Collection
              </h2>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Handpicked pieces for you</p>
            </div>
            <Link to="/products" className="text-gold-600 hover:text-gold-700 font-semibold flex items-center group text-sm sm:text-base self-start sm:self-auto">
              View All
              <ChevronRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-3 sm:p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl mb-3 sm:mb-4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shop by Category */}
      <ShopByCategory />

      {/* Collections Carousel */}
      <CollectionsCarousel collections={collections} />

      {/* Testimonials */}
      <Testimonials testimonials={testimonials} />

      {/* Editorial Banner */}
      <EditorialBanner editorial={editorial} />

      {/* Stats Section */}
      <section className="py-12 sm:py-14 md:py-16 bg-gradient-to-r from-gold-500 to-gold-700 text-white">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold">
                <CountUp end={10} suffix="K+" duration={2000} />
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1 sm:mt-2">Happy Customers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold">
                <CountUp end={5} suffix="K+" duration={2000} />
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1 sm:mt-2">Products Sold</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold">
                <CountUp end={4.9} decimals={1} duration={2000} />
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1 sm:mt-2">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl md:text-5xl font-playfair font-bold">
                <CountUp end={99} suffix="%" duration={2000} />
              </p>
              <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1 sm:mt-2">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-14 sm:py-16 lg:py-20 bg-white dark:bg-dark-bg">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-gold-50 to-white dark:from-gold-950/30 dark:to-dark-card p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-xl backdrop-blur-sm border border-gold-200/20">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-playfair font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
                  Subscribe to Our <span className="text-gold-600">Newsletter</span>
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
                  Get exclusive offers, early access to new arrivals, and 10% off your first order!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl whitespace-nowrap">
                    Subscribe
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 sm:mt-4">
                  No spam, unsubscribe anytime. We respect your privacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;