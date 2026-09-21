import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
} from 'lucide-react';
import {
  FaPinterestP,
  FaCcVisa,
  FaCcMastercard,
} from 'react-icons/fa';
import { SiPhonepe, SiRazorpay } from 'react-icons/si';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* ⭐ Wave — full footer, spans both bands, edge-to-edge */}
      <div className="absolute inset-0 z-10" aria-hidden="true">
        <img
          src="/footer-bg.png"
          alt=""
          className="w-full h-full object-cover object-right"
          draggable={false}
        />
      </div>

      {/* ============== TOP — CREAM SECTION (slightly transparent) ============== */}
      <div className="relative z-10 bg-gold-90/100 dark:bg-dark-card/100">
        <div className="container-custom py-10 sm:py-12 lg:py-20">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-8">

            {/* ============== COLUMN 1 — BRAND ============== */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="xs:col-span-2 sm:col-span-2 lg:col-span-1 lg:pr-8"
            >
              <div className="mb-5">
                <img
                  src="/kritya-logo-2.png"
                  alt="Kritya's Jewellery"
                  className="h-14 sm:h-16 md:h-20 lg:h-20 w-auto object-contain opacity-90 transition-opacity"
                  draggable={false}
                />
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6 max-w-md">
                Timeless jewellery for every moment. Discover elegance,
                craftsmanship and modern designs at Kritya's.
              </p>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {[
                  { Icon: Instagram, href: '#' },
                  { Icon: Facebook, href: '#' },
                  { Icon: FaPinterestP, href: '#' },
                  { Icon: Youtube, href: '#' },
                  { Icon: Linkedin, href: '#' },
                ].map(({ Icon, href }, index) => (
                  <motion.a
                    key={index}
                    href={href}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 shadow-sm hover:bg-gold-600 hover:text-white transition-colors duration-300"
                    aria-label="Social link"
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* ============== COLUMN 2 — QUICK LINKS ============== */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h4 className="font-playfair text-xl sm:text-2xl font-bold text-gold-600 mb-4 sm:mb-5">
                Quick Links
              </h4>
              <ul className="space-y-2.5 sm:space-y-3">
                {[
                  { name: 'Shop All', link: '/products' },
                  { name: 'Categories', link: '/categories' },
                  { name: 'Collections', link: '/collections' },
                  { name: 'New Arrivals', link: '/products?sort=newest' },
                  { name: 'Offers', link: '/offers' },
                  { name: 'About Us', link: '/about' },
                  { name: 'Contact Us', link: '/contact' },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.link}
                      className="group inline-flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gold-600 transition-colors"
                    >
                      <span className="relative">
                        {item.name}
                        <span className="absolute left-0 -bottom-0.5 h-[1px] w-0 bg-gold-600 transition-all duration-300 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ============== COLUMN 3 — CUSTOMER SERVICE ============== */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h4 className="font-playfair text-xl sm:text-2xl font-bold text-gold-600 mb-4 sm:mb-5">
                Customer Service
              </h4>
              <ul className="space-y-2.5 sm:space-y-3">
                {[
                  { name: 'Track Your Order', link: '/track-order' },
                  { name: 'Returns & Exchanges', link: '/returns' },
                  { name: 'Shipping Policy', link: '/shipping' },
                  { name: 'Payment Methods', link: '/payment-methods' },
                  { name: 'Size Guide', link: '/size-guide' },
                  { name: 'Jewellery Care', link: '/jewellery-care' },
                  { name: 'FAQ', link: '/faq' },
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.link}
                      className="group inline-flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gold-600 transition-colors"
                    >
                      <span className="relative">
                        {item.name}
                        <span className="absolute left-0 -bottom-0.5 h-[1px] w-0 bg-gold-600 transition-all duration-300 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ============== COLUMN 4 — CONTACT + NEWSLETTER ============== */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="xs:col-span-2 sm:col-span-2 lg:col-span-1"
            >
              <h4 className="font-playfair text-xl sm:text-2xl font-bold text-gold-600 mb-4 sm:mb-5">
                Get in Touch
              </h4>

              <ul className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
                <li className="flex items-start gap-3">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    +91 98765 43210
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 break-all">
                    support@krityas.com
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    123 Jewellery Street, Mumbai,
                    <br />
                    Maharashtra 400001, India
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Mon – Sat, 10:00 AM – 7:00 PM
                  </span>
                </li>
              </ul>

              <div className="max-w-md lg:max-w-none">
                <input
                  type="email"
                  placeholder="Your Email Address"
                  className="w-full px-4 py-2.5 sm:py-3 bg-white dark:bg-dark-bg border border-gold-200 dark:border-dark-border rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent mb-3"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 sm:py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                >
                  Subscribe
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ============== BOTTOM — GOLD BAR ============== */}
      <div className="relative z-10 bg-gradient-to-r from-gold-700/95 via-gold-600/95 to-gold-700/95 text-white">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-center md:text-left">
            <p className="text-xs sm:text-sm text-white/90 order-2 md:order-1">
              &copy; {currentYear} Kritya's Jewellery. All rights reserved.
            </p>

            <div className="flex items-center gap-2 order-1 md:order-2">
              <span className="text-xs sm:text-sm text-white/90">Made with</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-red-500 drop-shadow-sm"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-xs sm:text-sm text-white/90">in India</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 order-3 w-full md:w-auto">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90 flex-wrap justify-center">
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
                <Link to="/refund" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </div>

              <div className="hidden sm:block h-6 w-px bg-white/30" />

              <div className="flex items-center gap-2">
                <PaymentBadge><FaCcVisa className="h-5 w-5" /></PaymentBadge>
                <PaymentBadge><FaCcMastercard className="h-5 w-5" /></PaymentBadge>
                <PaymentBadge><SiPhonepe className="h-5 w-5" /></PaymentBadge>
                <PaymentBadge><SiRazorpay className="h-5 w-5" /></PaymentBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const PaymentBadge = ({ children }) => (
  <div className="h-7 sm:h-8 w-10 sm:w-12 flex items-center justify-center bg-white rounded-md shadow-sm">
    <span className="text-gray-800">{children}</span>
  </div>
);

export default Footer;