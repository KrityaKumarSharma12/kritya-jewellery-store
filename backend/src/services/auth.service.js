const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

// Roles that can access the admin panel (from the AdminRole enum in schema.prisma)
const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'ORDER_MANAGER',
  'CUSTOMER_SUPPORT',
  'ACCOUNTANT',
];

class AuthService {
  // ============== REGISTER ==============
  async register({ email, password, name, phone, address }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Prevent customer signup with an email already used by an admin
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingAdmin) {
      const err = new Error('This email is already registered as an admin account');
      err.statusCode = 409;
      throw err;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      const err = new Error('User already exists');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        phone,
        address,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user };
  }

  // ============== LOGIN ==============
  async login({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // ---------- 1) Try AdminUser table first ----------
    const admin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (admin) {
      if (!admin.isActive) {
        const err = new Error('This admin account is deactivated');
        err.statusCode = 401;
        throw err;
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        const err = new Error('Invalid credentials');
        err.statusCode = 401;
        throw err;
      }

      // Update lastLogin timestamp (best-effort)
      try {
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        });
      } catch (_) {
        /* non-fatal */
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role, kind: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { id: admin.id, kind: 'admin' },
        JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      // Never return the password hash
      const { password: _, ...adminWithoutPassword } = admin;

      return {
        token,
        refreshToken,
        user: {
          ...adminWithoutPassword,
          // Frontend expects these two fields to exist:
          role: admin.role,
          isAdmin: true,
        },
      };
    }

    // ---------- 2) Fall back to User (customer) table ----------
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, kind: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, kind: 'user' },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return { token, refreshToken, user: userWithoutPassword };
  }

  // ============== REFRESH TOKEN ==============
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      const err = new Error('Refresh token required');
      err.statusCode = 400;
      throw err;
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (_) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    // Try AdminUser first if the token was issued for an admin
    if (decoded.kind === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
      });

      if (!admin || !admin.isActive) {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        throw err;
      }

      const newToken = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role, kind: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { token: newToken };
    }

    // Otherwise, treat as a customer
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, kind: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token: newToken };
  }
}

module.exports = new AuthService();