const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, profileController.index);
router.post('/', ensureAuthenticated, profileController.update);
router.post('/change-password', ensureAuthenticated, profileController.changePassword);

module.exports = router;
