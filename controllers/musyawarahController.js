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
            const created_by = req.session.user.id;

            await Musyawarah.create({ judul, konten, lampiran, tanggal, created_by });
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
        const comments = await Musyawarah.getComments(req.params.id);
        const editHistory = await Musyawarah.getEditHistory(req.params.id);

        // Merge comments and edit history into timeline
        const timeline = [
            ...comments.map(c => ({ ...c, type: 'comment', timestamp: c.created_at })),
            ...editHistory.map(e => ({ ...e, type: 'edit', timestamp: e.edited_at }))
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.render('musyawarah/show', { title: item.judul, item, timeline, moment });
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
};

exports.edit = async (req, res) => {
    try {
        const item = await Musyawarah.findById(req.params.id);
        if (!item) return res.status(404).send('Not found');
        res.render('musyawarah/edit', { title: 'Edit Notulensi/Info', item, moment });
    } catch (e) {
        console.error(e);
        res.redirect('/musyawarah');
    }
};

exports.update = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect(`/musyawarah/edit/${req.params.id}`);
        }
        try {
            const { id } = req.params;
            const { judul, konten, tanggal } = req.body;
            const updated_by = req.session.user.id;
            const item = await Musyawarah.findById(id);

            let lampiran = item.lampiran;
            if (req.file) {
                // Delete old file if exists
                if (lampiran) {
                    const oldPath = path.join('public/uploads/musyawarah', lampiran);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                lampiran = req.file.filename;
            }

            await Musyawarah.update(id, { judul, konten, lampiran, tanggal, updated_by });
            req.flash('success_msg', 'Info Musyawarah berhasil diperbarui');
            res.redirect(`/musyawarah/view/${id}`);
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal memperbarui data');
            res.redirect(`/musyawarah/edit/${req.params.id}`);
        }
    });
};

exports.addComment = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            // We might not have musyawarah_id in body if multer fails early, but usually we do
            // Defaulting to back if possible, or try to extract ID from referrer if needed.
            return res.redirect('back');
        }
        try {
            const { musyawarah_id, konten, parent_id } = req.body;
            const user_id = req.session.user.id;
            const lampiran = req.file ? req.file.filename : null;

            if (!konten || konten.trim() === '<p><br></p>') {
                // If there is an attachment, content can be optional-ish or we still require it?
                // Usually comments should have content. Let's keep the check but relax it if there's a file?
                // For now, keep strict check on content.
                if (!lampiran) {
                    req.flash('error_msg', 'Komentar tidak boleh kosong');
                    return res.redirect(`/musyawarah/view/${musyawarah_id}`);
                }
            }

            await Musyawarah.addComment({ musyawarah_id, user_id, konten, parent_id, lampiran });
            req.flash('success_msg', 'Komentar berhasil ditambahkan');
            res.redirect(`/musyawarah/view/${musyawarah_id}`);
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal menambahkan komentar');
            res.redirect(`/musyawarah/view/${req.body.musyawarah_id}`);
        }
    });
};
