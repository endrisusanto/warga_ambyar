const Warga = require('../models/Warga');

exports.index = async (req, res) => {
    try {
        const warga = await Warga.getAll();
        res.render('warga/index', { title: 'Data Warga', warga });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.create = (req, res) => {
    res.render('warga/create', { title: 'Tambah Warga' });
};

exports.store = async (req, res) => {
    try {
        await Warga.create(req.body);
        req.flash('success_msg', 'Data warga berhasil ditambahkan');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menambah data');
        res.redirect('/warga/create');
    }
};

exports.edit = async (req, res) => {
    try {
        const warga = await Warga.findById(req.params.id);
        res.render('warga/edit', { title: 'Edit Warga', warga });
    } catch (err) {
        console.error(err);
        res.redirect('/warga');
    }
};

exports.update = async (req, res) => {
    try {
        await Warga.update(req.params.id, req.body);
        req.flash('success_msg', 'Data warga berhasil diupdate');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update data');
        res.redirect(`/warga/edit/${req.params.id}`);
    }
};

exports.delete = async (req, res) => {
    try {
        await Warga.delete(req.params.id);
        req.flash('success_msg', 'Data warga berhasil dihapus');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menghapus data');
        res.redirect('/warga');
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        await Warga.updateRole(req.params.id, role);
        req.flash('success_msg', 'Role berhasil diupdate');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update role');
        res.redirect('/warga');
    }
};

exports.approve = async (req, res) => {
    try {
        await Warga.updateApprovalStatus(req.params.id, 'approved');
        req.flash('success_msg', 'Warga berhasil diapprove');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal approve warga');
        res.redirect('/warga');
    }
};

exports.reject = async (req, res) => {
    try {
        await Warga.updateApprovalStatus(req.params.id, 'rejected');
        req.flash('success_msg', 'Warga berhasil direject');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal reject warga');
        res.redirect('/warga');
    }
};
