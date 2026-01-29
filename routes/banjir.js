const express = require('express');
const router = express.Router();
const banjirController = require('../controllers/banjirController');
const { ensureAuthenticated } = require('../middleware/auth');

// Water level monitoring routes - Public Access
router.get('/', banjirController.index);
router.get('/api/data', banjirController.getData);
router.post('/share-image', banjirController.uploadShareImage);
router.get('/v/:id', banjirController.viewShare);

module.exports = router;
