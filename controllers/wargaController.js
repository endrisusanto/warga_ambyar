const Warga = require('../models/Warga');
const ExcelJS = require('exceljs');

exports.exportExcel = async (req, res) => {
    try {
        const warga = await Warga.getAll();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Warga');

        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama', key: 'nama', width: 25 },
            { header: 'NIK', key: 'nik', width: 20 },
            { header: 'No KK', key: 'no_kk', width: 20 },
            { header: 'L/P', key: 'jenis_kelamin', width: 10 },
            { header: 'Blok', key: 'blok', width: 8 },
            { header: 'No Rumah', key: 'nomor_rumah', width: 10 },
            { header: 'Tim Ronda', key: 'tim_ronda', width: 10 },
            { header: 'No HP', key: 'no_hp', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Status Huni', key: 'status_huni', width: 15 },
            { header: 'Role', key: 'role', width: 10 }
        ];

        warga.forEach((w, index) => {
            worksheet.addRow({
                no: index + 1,
                nama: w.nama,
                nik: w.nik,
                no_kk: w.no_kk,
                jenis_kelamin: w.jenis_kelamin,
                blok: w.blok,
                nomor_rumah: w.nomor_rumah,
                tim_ronda: w.tim_ronda || '-',
                no_hp: w.no_hp,
                email: w.email,
                status_huni: w.status_huni,
                role: w.role
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'data_warga.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal export excel');
        res.redirect('/warga');
    }
};

exports.index = async (req, res) => {
    try {
        // Auto-reset logic for unregistered users removed to allow manual names.
        // const db = require('../config/db');
        // Drop unique constraint to allow multiple 'Blok - No' names per house
        // try { await db.query("ALTER TABLE warga DROP INDEX unique_rumah_person"); } catch (e) { }

        // Cleanup duplicates logic remains optional or can be removed if specific cleanup needed.
        // For now, removing the auto-reset block entirely is key.

        const warga = await Warga.getAll();
        res.render('warga/index', { title: 'Data Warga', warga, useWideContainer: true, noPadding: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error: ' + err.message);
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
        console.error('Update Role Error:', err);
        req.flash('error_msg', 'Gagal update role: ' + err.message);
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

exports.updateApproval = async (req, res) => {
    try {
        const { approval_status } = req.body;
        await Warga.updateApprovalStatus(req.params.id, approval_status);
        req.flash('success_msg', `Status approval berhasil diupdate menjadi ${approval_status}`);
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update approval status');
        res.redirect('/warga');
    }
};

exports.toggleRonda = async (req, res) => {
    try {
        await Warga.toggleRonda(req.params.id);
        req.flash('success_msg', 'Status ronda berhasil diupdate');
        res.redirect('/warga');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update status ronda');
        res.redirect('/warga');
    }
};

exports.resetNames = async (req, res) => {
    try {
        const db = require('../config/db');
        const [result] = await db.query(`
            UPDATE warga w
            LEFT JOIN users u ON w.id = u.warga_id
            SET w.nama = CONCAT('Blok ', w.blok, ' - ', w.nomor_rumah)
            WHERE u.id IS NULL
        `);
        res.send(`Reset names successful. Updated ${result.changedRows} rows.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error resetting names: ' + err.message);
    }
};
