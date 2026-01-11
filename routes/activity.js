const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/timeline', ensureAuthenticated, activityController.timeline);

module.exports = router;
