const Event = require('../models/Event');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// --- Configuration ---
const shareDir = './public/uploads/shares/events/';
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

const shareStorage = multer.diskStorage({
    destination: shareDir,
    filename: function (req, file, cb) {
        cb(null, 'event-share-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const uploadShare = multer({ storage: shareStorage }).single('image');

// --- Controller Methods ---

exports.uploadEventShare = (req, res) => {
    uploadShare(req, res, async (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        try {
            const eventId = req.body.eventId || null;
            const shareId = await Event.createShare(eventId, req.file.filename);
            res.json({ success: true, filename: req.file.filename, shareId });
        } catch (e) {
            console.error('Share Upload Error:', e);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });
};

exports.viewEventShare = async (req, res) => {
    try {
        const shareId = req.params.id;
        const share = await Event.getShare(shareId);

        if (!share) {
            return res.status(404).send('Link/Pengumuman tidak ditemukan.');
        }

        res.render('dashboard/public_event', {
            title: share.judul || 'Pengumuman Warga',
            share,
            moment
        });
    } catch (e) {
        console.error('View Share Error:', e);
        res.status(500).send('Terjadi kesalahan saat memuat halaman.');
    }
};
