const express = require('express');
const router = express.Router();
const rondaController = require('../controllers/rondaController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, rondaController.index);
router.get('/teams', ensureAuthenticated, rondaController.teams);
router.post('/teams/update', ensureAuthenticated, rondaController.updateTeam);
router.post('/manual-add', ensureAuthenticated, rondaController.addManualParticipant);
router.post('/update-status', ensureAuthenticated, rondaController.updateStatus);
router.post('/pay-fine', ensureAuthenticated, rondaController.payFine);
router.post('/pay-fine-upload', ensureAuthenticated, rondaController.submitFine);
router.post('/verify-fine', ensureAuthenticated, rondaController.verifyFine);
router.post('/upload-photos/:id', ensureAuthenticated, rondaController.uploadPhotos);
router.post('/upload-condition/:date', ensureAuthenticated, rondaController.uploadCondition);
router.post('/delete-photo', ensureAuthenticated, rondaController.deletePhoto);
router.post('/share-image', ensureAuthenticated, rondaController.uploadShareImage);
router.get('/control', ensureAuthenticated, rondaController.control);
router.get('/view', rondaController.viewPublic);
router.get('/v/:id', rondaController.viewPublic);

module.exports = router;
