const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { ensureAuthenticated } = require('../middleware/auth');

// Upload Image (Authenticated)
router.post('/event/upload', ensureAuthenticated, shareController.uploadEventShare);

// Public View (No Auth Required)
router.get('/event/v/:id', shareController.viewEventShare);

module.exports = router;
