const express = require('express');
const router = express.Router();
const pengaduanController = require('../controllers/pengaduanController');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/pengaduan');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.get('/', ensureAuthenticated, pengaduanController.index);
router.get('/create', ensureAuthenticated, pengaduanController.create);
router.post('/store', ensureAuthenticated, upload.single('foto'), pengaduanController.store);
router.get('/delete/:id', ensureAuthenticated, pengaduanController.delete);
router.get('/:id', ensureAuthenticated, pengaduanController.detail);
router.post('/:id/update', ensureAuthenticated, pengaduanController.updateStatus);
router.post('/comment', ensureAuthenticated, upload.single('lampiran'), pengaduanController.postComment);

router.get('/edit/:id', ensureAuthenticated, pengaduanController.edit);
router.post('/edit/:id', ensureAuthenticated, upload.single('foto'), pengaduanController.update);

module.exports = router;
