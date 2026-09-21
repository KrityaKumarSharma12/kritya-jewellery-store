// backend/src/routes/cms.routes.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Public: active categories (for "Shop by Category")
router.get('/categories', async (req, res) => {
  try {
    const where = {};
    if (req.query.isActive === 'true') where.isActive = true;
    const items = await prisma.category.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, slug: true, image: true,
        displayOrder: true, isActive: true,
      },
    });
    res.json({ items });
  } catch (error) {
    console.error('Public categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: active collections (for "Shop the Collections")
router.get('/collections', async (req, res) => {
  try {
    const items = await prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, slug: true, color: true,
        image: true, displayOrder: true,
      },
    });
    res.json({ items });
  } catch (error) {
    console.error('Public collections error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: active testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const items = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, name: true, city: true, rating: true,
        text: true, displayOrder: true,
      },
    });
    res.json({ items });
  } catch (error) {
    console.error('Public testimonials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: editorial banner (single row, active)
router.get('/homepage/editorial', async (req, res) => {
  try {
    const item = await prisma.homepageEditorial.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(item || null);
  } catch (error) {
    console.error('Public editorial error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;