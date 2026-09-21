const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public route (no authentication required)
router.get('/public', settingsController.getPublicSettings);

// Admin routes
router.get('/', authenticate, isAdmin, settingsController.getSettings);
router.put('/', authenticate, isAdmin, settingsController.updateSettings);

module.exports = router;