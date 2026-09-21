require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const uploadRoutes = require('./routes/upload.routes');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const pricingRoutes = require('./routes/pricing.routes');
const jewelleryRoutes = require('./routes/jewellery.routes');
const masterDataRoutes = require('./routes/masterData.routes');
const paymentRoutes = require('./routes/payment.routes');
const couponRoutes = require('./routes/coupon.routes');
const settingsRoutes = require('./routes/settings.routes');   // ✅ ADDED

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ============================================================
// STATIC UPLOADS
// ============================================================
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', 'uploads'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jewellery', jewelleryRoutes);
// app.use('/api/pricing', pricingRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/settings', settingsRoutes);    
app.use('/api/banners', require('./routes/banner.routes'));
app.use('/api/cms', require('./routes/cms.routes'));                 

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;