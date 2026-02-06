const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { ensureAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

router.get('/', ensureAuthenticated, isAdmin, monitoringController.index);

module.exports = router;
