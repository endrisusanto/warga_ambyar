const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, dashboardController.index);
router.post('/add-event', ensureAuthenticated, dashboardController.addEvent);
router.post('/edit-event/:id', ensureAuthenticated, dashboardController.editEvent);
router.post('/delete-event/:id', ensureAuthenticated, dashboardController.deleteEvent);

module.exports = router;
