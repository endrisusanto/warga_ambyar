const express = require('express');
const router = express.Router();
const rondaController = require('../controllers/rondaController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, rondaController.index);
router.get('/teams', ensureAuthenticated, rondaController.teams);
router.post('/teams/update', ensureAuthenticated, rondaController.updateTeam);
router.post('/update-status', ensureAuthenticated, rondaController.updateStatus);
router.post('/pay-fine', ensureAuthenticated, rondaController.payFine);
router.post('/upload-photos/:id', ensureAuthenticated, rondaController.uploadPhotos);
router.post('/upload-condition/:date', ensureAuthenticated, rondaController.uploadCondition);
router.post('/delete-photo', ensureAuthenticated, rondaController.deletePhoto);

module.exports = router;
