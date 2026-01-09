const express = require('express');
const router = express.Router();
const wargaController = require('../controllers/wargaController');
const { ensureAuthenticated } = require('../middleware/auth');
const { isAdmin, isAdminOrKetua, canEdit } = require('../middleware/roleCheck');

router.get('/', ensureAuthenticated, wargaController.index);
router.get('/create', ensureAuthenticated, canEdit, wargaController.create);
router.post('/store', ensureAuthenticated, canEdit, wargaController.store);
router.get('/edit/:id', ensureAuthenticated, canEdit, wargaController.edit);
router.post('/update/:id', ensureAuthenticated, canEdit, wargaController.update);
router.get('/delete/:id', ensureAuthenticated, canEdit, wargaController.delete);

// Role management (admin only)
router.post('/update-role/:id', ensureAuthenticated, isAdmin, wargaController.updateRole);

// Approval (admin or ketua)
router.get('/approve/:id', ensureAuthenticated, isAdminOrKetua, wargaController.approve);
router.get('/reject/:id', ensureAuthenticated, isAdminOrKetua, wargaController.reject);

module.exports = router;
