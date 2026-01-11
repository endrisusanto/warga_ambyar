const Musyawarah = require('../models/Musyawarah');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/musyawarah';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('lampiran');

exports.index = async (req, res) => {
    try {
        const list = await Musyawarah.getAll();
        res.render('musyawarah/index', { title: 'Musyawarah Warga', list, moment });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.create = (req, res) => {
    res.render('musyawarah/create', { title: 'Tulis Notulensi/Info' });
};

exports.store = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect('/musyawarah/create');
        }
        try {
            const { judul, konten, tanggal } = req.body;
            let lampiran = req.file ? req.file.filename : null;

            await Musyawarah.create({ judul, konten, lampiran, tanggal });
            req.flash('success_msg', 'Info Musyawarah berhasil disimpan');
            res.redirect('/musyawarah');
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal menyimpan data');
            res.redirect('/musyawarah/create');
        }
    });
};

exports.show = async (req, res) => {
    try {
        const item = await Musyawarah.findById(req.params.id);
        if (!item) return res.status(404).send('Not found');
        res.render('musyawarah/show', { title: item.judul, item, moment });
    } catch (e) {
        console.error(e);
        res.redirect('/musyawarah');
    }
};

exports.delete = async (req, res) => {
    try {
        const item = await Musyawarah.findById(req.params.id);
        if (item && item.lampiran) {
            const filePath = path.join('public/uploads/musyawarah', item.lampiran);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Musyawarah.delete(req.params.id);
        req.flash('success_msg', 'Data dihapus');
        res.redirect('/musyawarah');
    } catch (e) {
        console.error(e);
        req.flash('error_msg', 'Error deleting');
        res.redirect('/musyawarah');
    }
}
