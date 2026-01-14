const express = require('express');
const router = express.Router();
const keuanganController = require('../controllers/keuanganController');
const { isAuthenticated, isAdminOrBendahara } = require('../middleware/roleCheck');

router.get('/', isAuthenticated, keuanganController.index);
router.post('/add', isAdminOrBendahara, keuanganController.add);
router.post('/delete/:id', isAdminOrBendahara, keuanganController.delete);
router.get('/export', isAuthenticated, keuanganController.export);
router.get('/detail/:filename', isAuthenticated, keuanganController.getDetailByProof);
router.get('/transaksi/:filename', isAuthenticated, keuanganController.viewDetail);


module.exports = router;
