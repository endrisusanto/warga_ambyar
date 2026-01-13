const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const passport = require('passport');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Successful authentication
        req.session.user = req.user;

        // Check if profile is complete
        if (!req.user.warga_id) {
            return res.redirect('/auth/complete-profile');
        }

        res.redirect('/dashboard');
    }
);

router.get('/complete-profile', (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
}, authController.getCompleteProfile);

router.post('/complete-profile', (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
}, authController.postCompleteProfile);

router.get('/pending', authController.getPending);

module.exports = router;
