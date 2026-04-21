const express = require('express');
const router = express.Router();

// CCTV monitor is public, no auth required
router.get('/monitor', (req, res) => {
    res.render('cctv/monitor', {
        title: 'Monitor CCTV'
    });
});

module.exports = router;
