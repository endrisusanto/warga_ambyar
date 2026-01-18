const express = require('express');
const router = express.Router();
const controller = require('../controllers/donasiController');
const { ensureAuthenticated, isAdminOrBendahara } = require('../middleware/auth');

// Public routes
router.get('/', ensureAuthenticated, controller.index);

// Admin/Ketua/Bendahara routes - MUST come before :id routes
router.get('/campaign/create', ensureAuthenticated, isAdminOrBendahara, controller.createCampaign);
router.post('/campaign/store', ensureAuthenticated, isAdminOrBendahara, controller.storeCampaign);

router.get('/verify', ensureAuthenticated, isAdminOrBendahara, controller.verifyList);
router.post('/verify', ensureAuthenticated, isAdminOrBendahara, controller.verifyDonasi);

router.get('/laporan', ensureAuthenticated, isAdminOrBendahara, controller.laporanKeuangan);
router.get('/laporan/export', ensureAuthenticated, isAdminOrBendahara, controller.exportExcel);


// Parameterized routes - MUST come after specific routes
router.get('/campaign/:id', ensureAuthenticated, controller.showCampaign);
router.get('/campaign/:id/donate', ensureAuthenticated, controller.formDonasi);
router.get('/campaign/:id/edit', ensureAuthenticated, isAdminOrBendahara, controller.editCampaign);
router.post('/campaign/:id/update', ensureAuthenticated, isAdminOrBendahara, controller.updateCampaign);
router.get('/campaign/:id/delete', ensureAuthenticated, isAdminOrBendahara, controller.deleteCampaign);

// Neraca & Pengeluaran routes
router.get('/campaign/:id/neraca', ensureAuthenticated, isAdminOrBendahara, controller.neraca);
router.get('/campaign/:id/neraca/export', ensureAuthenticated, isAdminOrBendahara, controller.exportNeraca);
router.get('/campaign/:id/pengeluaran/create', ensureAuthenticated, isAdminOrBendahara, controller.formPengeluaran);
router.post('/pengeluaran/store', ensureAuthenticated, isAdminOrBendahara, controller.storePengeluaran);
router.get('/pengeluaran/:id/delete', ensureAuthenticated, isAdminOrBendahara, controller.deletePengeluaran);


router.post('/donate', ensureAuthenticated, controller.storeDonasi);



module.exports = router;
