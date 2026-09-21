const express = require('express');
const router = express.Router();
const adminService = require('../services/admin.service');

// Public: fetch live banners for the storefront
router.get('/live', async (req, res) => {
  try {
    const position = req.query.position || 'HOME';
    const banners = await adminService.getLiveBanners(position);

    // Only expose the fields the storefront needs
    res.json(
      banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        imageUrl: b.imageUrl,
        link: b.link,
        buttonText: b.buttonText,
        sortOrder: b.sortOrder,
      }))
    );
  } catch (error) {
    console.error('Get live banners error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: record a view (fire-and-forget)
router.post('/:id/view', async (req, res) => {
  try {
    await adminService.recordBannerView(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    // never fail — analytics shouldn't break UX
    res.json({ ok: false });
  }
});

// Public: record a click
router.post('/:id/click', async (req, res) => {
  try {
    await adminService.recordBannerClick(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: false });
  }
});

module.exports = router;