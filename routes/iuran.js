const express = require('express');
const router = express.Router();
const iuranController = require('../controllers/iuranController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, iuranController.index);
router.get('/control', ensureAuthenticated, iuranController.control);
router.get('/export', ensureAuthenticated, iuranController.exportExcel);
router.post('/generate', ensureAuthenticated, iuranController.generate);
router.get('/pay', ensureAuthenticated, iuranController.payForm);
router.post('/pay', ensureAuthenticated, iuranController.processPayment);
router.get('/confirm/:id', ensureAuthenticated, iuranController.confirm);
router.get('/arrears', ensureAuthenticated, iuranController.arrears);
router.post('/check-status', ensureAuthenticated, iuranController.checkStatus);
router.post('/generate-qris', ensureAuthenticated, iuranController.generateQris);

module.exports = router;
