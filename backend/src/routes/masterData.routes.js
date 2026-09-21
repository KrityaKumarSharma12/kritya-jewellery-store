const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterData.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public reads
router.get('/jewellery-types', masterDataController.getJewelleryTypes);
router.get('/collections', masterDataController.getCollections);
router.get('/occasions', masterDataController.getOccasions);
router.get('/product-styles', masterDataController.getProductStyles);
router.get('/karigars', masterDataController.getKarigars);
router.get('/metals', masterDataController.getMetals);
router.get('/metal-colors', masterDataController.getMetalColors);
router.get('/product-sizes', masterDataController.getProductSizes);
router.get('/gemstones', masterDataController.getGemstones);

// Admin creates
router.post('/jewellery-types', authenticate, isAdmin, masterDataController.createJewelleryType);
router.post('/collections', authenticate, isAdmin, masterDataController.createCollection);
router.post('/occasions', authenticate, isAdmin, masterDataController.createOccasion);
router.post('/product-styles', authenticate, isAdmin, masterDataController.createProductStyle);
router.post('/karigars', authenticate, isAdmin, masterDataController.createKarigar);

module.exports = router;