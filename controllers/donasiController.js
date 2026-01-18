const Donasi = require('../models/Donasi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Multer config for campaign photos
const campaignStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/donasi/campaign';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadCampaign = multer({
    storage: campaignStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('foto');

// Multer config for payment proof
const paymentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/donasi/bukti';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadPayment = multer({
    storage: paymentStorage,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB
}).single('bukti_bayar');

// Campaign Management
exports.index = async (req, res) => {
    try {
        const campaigns = await Donasi.getAllCampaigns();
        res.render('donasi/index', {
            title: 'Donasi & Penggalangan Dana',
            campaigns,
            moment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createCampaign = (req, res) => {
    res.render('donasi/create_campaign', { title: 'Buat Campaign Donasi' });
};

exports.storeCampaign = (req, res) => {
    uploadCampaign(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect('/donasi/campaign/create');
        }
        try {
            const { judul, deskripsi, target_dana, tanggal_mulai, tanggal_selesai } = req.body;
            const foto = req.file ? req.file.filename : null;
            const created_by = req.session.user.id;

            await Donasi.createCampaign({
                judul,
                deskripsi,
                target_dana: target_dana || 0,
                foto,
                tanggal_mulai,
                tanggal_selesai: tanggal_selesai || null,
                created_by
            });

            req.flash('success_msg', 'Campaign donasi berhasil dibuat');
            res.redirect('/donasi');
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal membuat campaign');
            res.redirect('/donasi/campaign/create');
        }
    });
};

exports.showCampaign = async (req, res) => {
    try {
        const campaign = await Donasi.getCampaignById(req.params.id);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');

        // Check if user is admin/ketua/bendahara
        const canViewReal = ['admin', 'ketua', 'bendahara'].includes(req.session.user.role);
        const showReal = canViewReal && req.query.showReal === 'true';

        const donatur = await Donasi.getDonaturByCampaign(req.params.id, showReal);

        res.render('donasi/show', {
            title: campaign.judul,
            campaign,
            donatur,
            showReal,
            canViewReal,
            moment
        });
    } catch (e) {
        console.error(e);
        res.redirect('/donasi');
    }
};

exports.editCampaign = async (req, res) => {
    try {
        const campaign = await Donasi.getCampaignById(req.params.id);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');
        res.render('donasi/edit_campaign', {
            title: 'Edit Campaign',
            campaign,
            moment
        });
    } catch (e) {
        console.error(e);
        res.redirect('/donasi');
    }
};

exports.updateCampaign = (req, res) => {
    uploadCampaign(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect(`/donasi/campaign/edit/${req.params.id}`);
        }
        try {
            const { id } = req.params;
            const { judul, deskripsi, target_dana, tanggal_mulai, tanggal_selesai, status } = req.body;
            const campaign = await Donasi.getCampaignById(id);

            let foto = campaign.foto;
            if (req.file) {
                if (foto) {
                    const oldPath = path.join('public/uploads/donasi/campaign', foto);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                foto = req.file.filename;
            }

            await Donasi.updateCampaign(id, {
                judul,
                deskripsi,
                target_dana: target_dana || 0,
                foto,
                tanggal_mulai,
                tanggal_selesai: tanggal_selesai || null,
                status
            });

            req.flash('success_msg', 'Campaign berhasil diperbarui');
            res.redirect(`/donasi/campaign/${id}`);
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal memperbarui campaign');
            res.redirect(`/donasi/campaign/edit/${req.params.id}`);
        }
    });
};

exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Donasi.getCampaignById(req.params.id);
        if (campaign && campaign.foto) {
            const filePath = path.join('public/uploads/donasi/campaign', campaign.foto);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Donasi.deleteCampaign(req.params.id);
        req.flash('success_msg', 'Campaign dihapus');
        res.redirect('/donasi');
    } catch (e) {
        console.error(e);
        req.flash('error_msg', 'Error menghapus campaign');
        res.redirect('/donasi');
    }
};

// Donation Transaction
exports.formDonasi = async (req, res) => {
    try {
        const campaign = await Donasi.getCampaignById(req.params.id);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');
        res.render('donasi/form_donasi', {
            title: 'Donasi - ' + campaign.judul,
            campaign
        });
    } catch (e) {
        console.error(e);
        res.redirect('/donasi');
    }
};

exports.storeDonasi = (req, res) => {
    uploadPayment(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect(`/donasi/campaign/${req.body.campaign_id}/donate`);
        }
        try {
            const { campaign_id, nama_donatur, is_anonim, jumlah, metode_bayar, pesan } = req.body;
            const bukti_bayar = req.file ? req.file.filename : null;
            const user_id = req.session.user.id;

            if (!bukti_bayar) {
                req.flash('error_msg', 'Bukti bayar wajib diupload');
                return res.redirect(`/donasi/campaign/${campaign_id}/donate`);
            }

            await Donasi.createDonasi({
                campaign_id,
                user_id,
                nama_donatur: nama_donatur || req.session.user.username,
                is_anonim: is_anonim === 'on',
                jumlah,
                metode_bayar,
                bukti_bayar,
                pesan: pesan || null
            });

            req.flash('success_msg', 'Donasi berhasil dikirim, menunggu verifikasi');
            res.redirect(`/donasi/campaign/${campaign_id}`);
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal mengirim donasi');
            res.redirect(`/donasi/campaign/${req.body.campaign_id}/donate`);
        }
    });
};

// Admin: Verify donations
exports.verifyList = async (req, res) => {
    try {
        const pending = await Donasi.getPendingDonasi();
        res.render('donasi/verify', {
            title: 'Verifikasi Donasi',
            pending,
            moment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.verifyDonasi = async (req, res) => {
    try {
        const { id, action } = req.body;
        const status = action === 'approve' ? 'verified' : 'rejected';
        const verified_by = req.session.user.id;

        await Donasi.verifyDonasi(id, verified_by, status);

        req.flash('success_msg', `Donasi ${status === 'verified' ? 'diverifikasi' : 'ditolak'}`);
        res.redirect('/donasi/verify');
    } catch (e) {
        console.error(e);
        req.flash('error_msg', 'Gagal memverifikasi donasi');
        res.redirect('/donasi/verify');
    }
};

// Financial Report
exports.laporanKeuangan = async (req, res) => {
    try {
        const campaignId = req.query.campaign || null;
        const campaigns = await Donasi.getAllCampaigns();
        const transaksi = await Donasi.getLaporanKeuangan(campaignId);

        const total = transaksi.reduce((sum, t) => sum + parseFloat(t.jumlah), 0);

        res.render('donasi/laporan', {
            title: 'Laporan Keuangan Donasi',
            campaigns,
            transaksi,
            total,
            selectedCampaign: campaignId,
            moment
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Export Excel
exports.exportExcel = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const campaignId = req.query.campaign || null;
        const campaigns = await Donasi.getAllCampaigns();
        const transaksi = await Donasi.getLaporanKeuangan(campaignId);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Donasi');

        // Set column widths
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal', key: 'tanggal', width: 20 },
            { header: 'Campaign', key: 'campaign', width: 30 },
            { header: 'Donatur', key: 'donatur', width: 25 },
            { header: 'Anonim', key: 'anonim', width: 10 },
            { header: 'Metode', key: 'metode', width: 12 },
            { header: 'Jumlah (Rp)', key: 'jumlah', width: 18 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        // Add data
        transaksi.forEach((t, index) => {
            worksheet.addRow({
                no: index + 1,
                tanggal: moment(t.verified_at).format('DD MMM YYYY HH:mm'),
                campaign: t.campaign_judul,
                donatur: t.nama_donatur,
                anonim: t.is_anonim ? 'Ya' : 'Tidak',
                metode: t.metode_bayar.toUpperCase(),
                jumlah: parseFloat(t.jumlah)
            });
        });

        // Format currency column
        worksheet.getColumn('jumlah').numFmt = '#,##0';

        // Add total row
        const totalRow = worksheet.addRow({
            no: '',
            tanggal: '',
            campaign: '',
            donatur: '',
            anonim: '',
            metode: 'TOTAL',
            jumlah: transaksi.reduce((sum, t) => sum + parseFloat(t.jumlah), 0)
        });

        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Generate filename
        const campaignName = campaignId ?
            campaigns.find(c => c.id == campaignId)?.judul.replace(/[^a-zA-Z0-9]/g, '_') :
            'Semua_Campaign';
        const filename = `Laporan_Donasi_${campaignName}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating Excel file');
    }
};


// Pengeluaran (Expense) Management
const expenseStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/donasi/pengeluaran';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadExpense = multer({
    storage: expenseStorage,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB
}).single('bukti');

exports.neraca = async (req, res) => {
    try {
        const campaignId = req.params.id;
        const campaign = await Donasi.getCampaignById(campaignId);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');

        const neraca = await Donasi.getNeraca(campaignId);
        const pengeluaran = await Donasi.getPengeluaranByCampaign(campaignId);

        res.render('donasi/neraca', {
            title: 'Neraca - ' + campaign.judul,
            campaign,
            neraca,
            pengeluaran,
            moment
        });
    } catch (e) {
        console.error(e);
        res.redirect('/donasi');
    }
};

exports.formPengeluaran = async (req, res) => {
    try {
        const campaign = await Donasi.getCampaignById(req.params.id);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');
        res.render('donasi/form_pengeluaran', {
            title: 'Input Pengeluaran - ' + campaign.judul,
            campaign
        });
    } catch (e) {
        console.error(e);
        res.redirect('/donasi');
    }
};

exports.storePengeluaran = (req, res) => {
    uploadExpense(req, res, async (err) => {
        if (err) {
            console.error(err);
            req.flash('error_msg', 'Upload error: ' + err.message);
            return res.redirect(`/donasi/campaign/${req.body.campaign_id}/pengeluaran/create`);
        }
        try {
            const { campaign_id, tanggal, deskripsi, kategori, jumlah } = req.body;
            const bukti = req.file ? req.file.filename : null;
            const created_by = req.session.user.id;

            await Donasi.createPengeluaran({
                campaign_id,
                tanggal,
                deskripsi,
                kategori,
                jumlah,
                bukti,
                created_by
            });

            req.flash('success_msg', 'Pengeluaran berhasil dicatat');
            res.redirect(`/donasi/campaign/${campaign_id}/neraca`);
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal mencatat pengeluaran');
            res.redirect(`/donasi/campaign/${req.body.campaign_id}/pengeluaran/create`);
        }
    });
};

exports.deletePengeluaran = async (req, res) => {
    try {
        const pengeluaran = await Donasi.getPengeluaranById(req.params.id);
        if (!pengeluaran) {
            req.flash('error_msg', 'Pengeluaran tidak ditemukan');
            return res.redirect('/donasi');
        }

        const campaignId = req.query.campaign_id;

        // Delete file if exists
        if (pengeluaran.bukti) {
            const filePath = path.join('public/uploads/donasi/pengeluaran', pengeluaran.bukti);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await Donasi.deletePengeluaran(req.params.id);
        req.flash('success_msg', 'Pengeluaran dihapus');
        res.redirect(`/donasi/campaign/${campaignId}/neraca`);
    } catch (e) {
        console.error(e);
        req.flash('error_msg', 'Error menghapus pengeluaran');
        res.redirect('/donasi');
    }
};


// Export Neraca to Excel
exports.exportNeraca = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const campaignId = req.params.id;
        const campaign = await Donasi.getCampaignById(campaignId);
        if (!campaign) return res.status(404).send('Campaign tidak ditemukan');

        const neraca = await Donasi.getNeraca(campaignId);
        const donasi = await Donasi.getDonaturByCampaign(campaignId, true); // Get real names
        const pengeluaran = await Donasi.getPengeluaranByCampaign(campaignId);

        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Summary
        const summarySheet = workbook.addWorksheet('Ringkasan');
        summarySheet.columns = [
            { header: 'Keterangan', key: 'keterangan', width: 30 },
            { header: 'Jumlah (Rp)', key: 'jumlah', width: 20 }
        ];

        // Style header
        summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }
        };
        summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add summary data
        summarySheet.addRow({ keterangan: 'Campaign', jumlah: campaign.judul });
        summarySheet.addRow({});
        summarySheet.addRow({ keterangan: 'Total Pemasukan (Donasi)', jumlah: neraca.pemasukan });
        summarySheet.addRow({ keterangan: 'Total Pengeluaran', jumlah: neraca.pengeluaran });
        summarySheet.addRow({});
        const saldoRow = summarySheet.addRow({ keterangan: 'SALDO', jumlah: neraca.saldo });
        saldoRow.font = { bold: true, size: 14 };
        saldoRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: neraca.saldo >= 0 ? 'FF10B981' : 'FFFBBF24' }
        };

        // Format currency
        summarySheet.getColumn('jumlah').numFmt = '#,##0';

        // Sheet 2: Pemasukan (Donasi)
        const pemasukanSheet = workbook.addWorksheet('Pemasukan');
        pemasukanSheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal', key: 'tanggal', width: 20 },
            { header: 'Donatur', key: 'donatur', width: 25 },
            { header: 'Anonim', key: 'anonim', width: 10 },
            { header: 'Metode', key: 'metode', width: 12 },
            { header: 'Jumlah (Rp)', key: 'jumlah', width: 18 },
            { header: 'Bukti Bayar', key: 'bukti', width: 50 }
        ];

        // Style header
        pemasukanSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        pemasukanSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF10B981' }
        };
        pemasukanSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Get base URL from request
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Add data
        donasi.forEach((d, index) => {
            const buktiUrl = d.bukti_bayar ? `${baseUrl}/uploads/donasi/bukti/${d.bukti_bayar}` : '-';
            pemasukanSheet.addRow({
                no: index + 1,
                tanggal: moment(d.created_at).format('DD MMM YYYY HH:mm'),
                donatur: d.nama_donatur,
                anonim: d.is_anonim ? 'Ya' : 'Tidak',
                metode: d.metode_bayar.toUpperCase(),
                jumlah: parseFloat(d.jumlah),
                bukti: buktiUrl
            });
        });

        pemasukanSheet.getColumn('jumlah').numFmt = '#,##0';

        // Add total
        const totalPemasukan = pemasukanSheet.addRow({
            no: '',
            tanggal: '',
            donatur: '',
            anonim: '',
            metode: 'TOTAL',
            jumlah: neraca.pemasukan,
            bukti: ''
        });
        totalPemasukan.font = { bold: true };
        totalPemasukan.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        // Sheet 3: Pengeluaran
        const pengeluaranSheet = workbook.addWorksheet('Pengeluaran');
        pengeluaranSheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal', key: 'tanggal', width: 20 },
            { header: 'Deskripsi', key: 'deskripsi', width: 35 },
            { header: 'Kategori', key: 'kategori', width: 15 },
            { header: 'Jumlah (Rp)', key: 'jumlah', width: 18 },
            { header: 'Bukti', key: 'bukti', width: 50 }
        ];

        // Style header
        pengeluaranSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        pengeluaranSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEF4444' }
        };
        pengeluaranSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data
        pengeluaran.forEach((p, index) => {
            const buktiUrl = p.bukti ? `${baseUrl}/uploads/donasi/pengeluaran/${p.bukti}` : '-';
            pengeluaranSheet.addRow({
                no: index + 1,
                tanggal: moment(p.tanggal).format('DD MMM YYYY HH:mm'),
                deskripsi: p.deskripsi,
                kategori: p.kategori || '-',
                jumlah: parseFloat(p.jumlah),
                bukti: buktiUrl
            });
        });

        pengeluaranSheet.getColumn('jumlah').numFmt = '#,##0';

        // Add total
        const totalPengeluaran = pengeluaranSheet.addRow({
            no: '',
            tanggal: '',
            deskripsi: '',
            kategori: 'TOTAL',
            jumlah: neraca.pengeluaran,
            bukti: ''
        });
        totalPengeluaran.font = { bold: true };
        totalPengeluaran.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };

        // Add borders to all sheets
        [summarySheet, pemasukanSheet, pengeluaranSheet].forEach(sheet => {
            sheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
        });

        // Generate filename
        const campaignName = campaign.judul.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Neraca_${campaignName}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating Excel file');
    }
};

module.exports = exports;

