const Pengaduan = require('../models/Pengaduan');
const moment = require('moment');

exports.index = async (req, res) => {
    try {
        const stats = await Pengaduan.getStats();
        const complaints = await Pengaduan.getAll();

        complaints.forEach(c => {
            c.formattedDate = moment(c.created_at).format('DD MMM YYYY, HH:mm');
        });

        res.render('pengaduan/index', {
            title: 'Layanan Pengaduan',
            user: req.session.user,
            stats,
            complaints,
            path: '/pengaduan',
            moment: moment
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.create = async (req, res) => {
    res.render('pengaduan/create', {
        title: 'Buat Pengaduan',
        user: req.session.user,
        path: '/pengaduan'
    });
};

exports.store = async (req, res) => {
    try {
        const { judul, deskripsi, is_anonim } = req.body;
        const foto = req.file ? '/uploads/pengaduan/' + req.file.filename : null;

        await Pengaduan.create({
            warga_id: req.session.user.warga_id,
            judul,
            deskripsi,
            foto,
            is_anonim: is_anonim === 'on' ? true : false
        });

        req.flash('success_msg', 'Pengaduan berhasil dikirim');
        res.redirect('/pengaduan');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal mengirim pengaduan');
        res.redirect('/pengaduan/create');
    }
};

exports.detail = async (req, res) => {
    try {
        const complaint = await Pengaduan.findById(req.params.id);
        if (!complaint) {
            req.flash('error_msg', 'Pengaduan tidak ditemukan');
            return res.redirect('/pengaduan');
        }

        const timeline = await Pengaduan.getTimeline(req.params.id);

        complaint.formattedDate = moment(complaint.created_at).format('DD MMM YYYY, HH:mm');

        res.render('pengaduan/detail', {
            title: 'Detail Pengaduan',
            user: req.session.user,
            complaint,
            timeline,
            path: '/pengaduan',
            moment: moment
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, tanggapan } = req.body;
        await Pengaduan.updateStatus(req.params.id, status, tanggapan, req.session.user.id);

        req.flash('success_msg', 'Status pengaduan diperbarui');
        res.redirect('/pengaduan/' + req.params.id);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal update status');
        res.redirect('/pengaduan/' + req.params.id);
    }
};

exports.postComment = async (req, res) => {
    try {
        const { pengaduan_id, parent_id, konten } = req.body;
        const lampiran = req.file ? req.file.filename : null;

        if ((!konten || konten.trim() === '<p><br></p>') && !lampiran) {
            req.flash('error_msg', 'Komentar tidak boleh kosong');
            return res.redirect('back');
        }

        await Pengaduan.addComment({
            pengaduan_id,
            user_id: req.session.user.id,
            parent_id: parent_id || null,
            konten,
            type: 'comment',
            lampiran
        });
        req.flash('success_msg', 'Komentar ditambahkan');
        res.redirect('/pengaduan/' + pengaduan_id);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal mengirim komentar');
        res.redirect('back');
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const complaint = await Pengaduan.findById(id);

        if (!complaint) {
            req.flash('error_msg', 'Pengaduan tidak ditemukan');
            return res.redirect('/pengaduan');
        }

        // Only Admin, Ketua, Bendahara, or the Creator can delete
        const isAuthorized = ['admin', 'ketua', 'bendahara'].includes(req.session.user.role) ||
            (complaint.warga_id === req.session.user.warga_id);

        if (!isAuthorized) {
            req.flash('error_msg', 'Tidak ada izin untuk menghapus');
            return res.redirect('/pengaduan/' + id);
        }

        await Pengaduan.delete(id);
        req.flash('success_msg', 'Pengaduan berhasil dihapus');
        res.redirect('/pengaduan');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menghapus pengaduan');
        res.redirect('/pengaduan');
    }
};

exports.edit = async (req, res) => {
    try {
        const id = req.params.id;
        const complaint = await Pengaduan.findById(id);

        if (!complaint) {
            req.flash('error_msg', 'Pengaduan tidak ditemukan');
            return res.redirect('/pengaduan');
        }

        // Auth check: Admin or Creator
        const isAuthorized = ['admin'].includes(req.session.user.role) || (complaint.warga_id === req.session.user.warga_id);

        if (!isAuthorized) {
            req.flash('error_msg', 'Anda tidak memiliki izin untuk mengedit pengaduan ini');
            return res.redirect('/pengaduan/' + id);
        }

        res.render('pengaduan/edit', {
            title: 'Edit Pengaduan',
            user: req.session.user,
            complaint,
            path: '/pengaduan'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const complaint = await Pengaduan.findById(id);

        if (!complaint) {
            req.flash('error_msg', 'Pengaduan tidak ditemukan');
            return res.redirect('/pengaduan');
        }

        // Auth check
        const isAuthorized = ['admin'].includes(req.session.user.role) || (complaint.warga_id === req.session.user.warga_id);

        if (!isAuthorized) {
            req.flash('error_msg', 'Anda tidak memiliki izin untuk mengedit pengaduan ini');
            return res.redirect('/pengaduan/' + id);
        }

        const { judul, deskripsi, is_anonim } = req.body;
        const foto = req.file ? '/uploads/pengaduan/' + req.file.filename : null;

        // Change Detection for Logging
        const changes = [];
        if (complaint.judul !== judul) changes.push('Judul');
        if (complaint.deskripsi !== deskripsi) changes.push('Deskripsi');
        if (foto) changes.push('Foto');
        const anonimBool = is_anonim === 'on';
        // Note: DB usually returns 1/0 for boolean. Compare using loose equality or !!
        if ((!!complaint.is_anonim) !== anonimBool) changes.push('Status Anonim');

        let logMessage = null;
        if (changes.length > 0) {
            logMessage = `Update konten: ${changes.join(', ')}`;
        }

        await Pengaduan.update(id, {
            judul,
            deskripsi,
            foto,
            is_anonim: anonimBool
        }, req.session.user.id, logMessage);

        req.flash('success_msg', 'Pengaduan berhasil diperbarui');
        res.redirect('/pengaduan/' + id);

    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memperbarui pengaduan');
        res.redirect('/pengaduan/edit/' + req.params.id);
    }
};
