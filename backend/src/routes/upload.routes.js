const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

// POST /api/upload
router.post(
  '/',
  uploadController.uploadSingle,
  uploadController.handleUpload
);

module.exports = router;