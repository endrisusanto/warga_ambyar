const express = require('express');
const router = express.Router();
const keuanganController = require('../controllers/keuanganController');
const { isAuthenticated, isAdminOrBendahara } = require('../middleware/roleCheck');

router.get('/', isAuthenticated, keuanganController.index);
router.post('/add', isAdminOrBendahara, keuanganController.add);
router.get('/export', isAuthenticated, keuanganController.export);

module.exports = router;
