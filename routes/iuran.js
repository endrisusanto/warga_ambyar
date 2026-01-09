const express = require('express');
const router = express.Router();
const iuranController = require('../controllers/iuranController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, iuranController.index);
router.post('/generate', ensureAuthenticated, iuranController.generate);
router.get('/pay', ensureAuthenticated, iuranController.payForm);
router.post('/pay', ensureAuthenticated, iuranController.processPayment);
router.get('/confirm/:id', ensureAuthenticated, iuranController.confirm);
router.get('/arrears', ensureAuthenticated, iuranController.arrears);

module.exports = router;
