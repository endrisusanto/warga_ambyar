const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, profileController.index);
router.post('/update', ensureAuthenticated, profileController.update);

module.exports = router;
