const express = require('express');
const router = express.Router();
const controller = require('../controllers/musyawarahController');
const { ensureAuthenticated, isAdminOrBendahara } = require('../middleware/auth');

router.get('/', ensureAuthenticated, controller.index);
router.get('/create', ensureAuthenticated, isAdminOrBendahara, controller.create);
router.post('/store', ensureAuthenticated, isAdminOrBendahara, controller.store);
router.get('/view/:id', ensureAuthenticated, controller.show);
router.get('/delete/:id', ensureAuthenticated, isAdminOrBendahara, controller.delete);

module.exports = router;
