const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/monitor', ensureAuthenticated, (req, res) => {
    res.render('cctv/monitor', {
        title: 'Monitor CCTV'
    });
});

module.exports = router;
