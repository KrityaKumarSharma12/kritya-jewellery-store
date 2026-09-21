const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Every role from the AdminRole enum in schema.prisma
const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'CUSTOMER_SUPPORT',
  'ACCOUNTANT',
];

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // The token may have been issued for either an AdminUser or a User.
    // Check the "kind" claim first if present, then fall back to trying both tables.
    let user = null;
    let kind = null;

    if (decoded.kind === 'admin') {
      user = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
      kind = 'admin';
    } else if (decoded.kind === 'user') {
      user = await prisma.user.findUnique({ where: { id: decoded.id } });
      kind = 'user';
    } else {
      // Legacy tokens without the "kind" claim — try AdminUser first, then User.
      user = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
      if (user) {
        kind = 'admin';
      } else {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user) kind = 'user';
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Deactivated admins cannot use the API
    if (kind === 'admin' && user.isActive === false) {
      return res.status(401).json({ message: 'This account is deactivated' });
    }

    // Attach the resolved user to req, with a marker for which table it came from
    req.user = user;
    req.userKind = kind;
    req.isAdminUser = kind === 'admin';
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.isAdmin = (req, res, next) => {
  // An admin is any account whose role is one of the ADMIN_ROLES enum values.
  // This covers both AdminUser tokens and legacy User tokens where role='ADMIN'.
  const role = req.user?.role;

  if (!ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

exports.isCustomer = (req, res, next) => {
  if (req.user?.role !== 'CUSTOMER') {
    return res.status(403).json({ message: 'Customer access required' });
  }
  next();
};