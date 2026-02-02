const Kas = require('../models/Kas');
const Warga = require('../models/Warga');
const Iuran = require('../models/Iuran');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('../config/db');



// Multer Setup
const storage = multer.diskStorage({
    destination: './public/uploads/keuangan/', // Make sure this dir exists
    filename: function (req, file, cb) {
        cb(null, 'kas-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb('Error: Only images and PDFs allowed');
    }
}).single('bukti_foto');

exports.index = async (req, res) => {
    // Initialize with defaults
    let saldo = 0;
    let transactions = [];
    let trend = [];
    let pemasukanBulanIni = 0;
    let pengeluaranBulanIni = 0;
    let totalPiutang = 0;
    let chartData = { labels: [], income: [], expense: [] };

    try {
        saldo = await Kas.getBalance();
        transactions = await Kas.getAll(); // All transactions
        trend = await Kas.getMonthlyTrend();

        // Calculate this month summary
        const currentMonth = moment().format('YYYY-MM');
        const thisMonthTrans = transactions.filter(t => moment(t.tanggal).format('YYYY-MM') === currentMonth);

        pemasukanBulanIni = thisMonthTrans
            .filter(t => t.tipe === 'masuk')
            .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        pengeluaranBulanIni = thisMonthTrans
            .filter(t => t.tipe === 'keluar')
            .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        // Calculate Piutang (Unpaid Bills)
        try {
            const [piutangRows] = await db.query(`
                SELECT SUM(i.jumlah) as total_piutang
                FROM iuran i
                JOIN warga w ON i.warga_id = w.id
                WHERE i.status != 'lunas'
            `);
            totalPiutang = piutangRows[0]?.total_piutang || 0;
        } catch (piutangErr) {
            console.error('Error fetching piutang:', piutangErr);
            // Fallback to 0 if query fails
            totalPiutang = 0;
        }

        // Chart Data
        chartData = {
            labels: trend.map(t => moment(t.bulan).format('MMM YYYY')).reverse(),
            income: trend.map(t => Number(t.pemasukan || 0)).reverse(),
            expense: trend.map(t => Number(t.pengeluaran || 0)).reverse()
        };

    } catch (err) {
        console.error('Error in keuangan index:', err);
        // Don't redirect, just render with default values
    }

    // Always render, even if there were errors
    res.render('keuangan/index', {
        title: 'Laporan Keuangan',
        saldo,
        pemasukanBulanIni,
        pengeluaranBulanIni,
        totalPiutang,
        transactions: transactions.slice(0, 100), // Limit 100 newest
        chartData: JSON.stringify(chartData),
        moment,
        user: req.session.user,
        useWideContainer: true
    });
};

exports.add = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/keuangan');
        }
        try {
            const { tipe, jumlah, keterangan, tanggal } = req.body;
            const bukti = req.file ? req.file.filename : null;

            await Kas.add(tipe, jumlah, keterangan, tanggal || moment().format('YYYY-MM-DD HH:mm:ss'), bukti);

            req.flash('success_msg', 'Transaksi berhasil disimpan');
            res.redirect('/keuangan');
        } catch (e) {
            console.error(e);
            req.flash('error_msg', 'Gagal menyimpan transaksi');
            res.redirect('/keuangan');
        }
    });
};

exports.export = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();

        // --- SHEET 1: Neraca Mutasi Keuangan ---
        const sheet1 = workbook.addWorksheet('Neraca Mutasi');
        sheet1.columns = [
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'Keterangan', key: 'keterangan', width: 40 },
            { header: 'Tipe', key: 'tipe', width: 10 },
            { header: 'Masuk (Debit)', key: 'debit', width: 15 },
            { header: 'Keluar (Kredit)', key: 'kredit', width: 15 },
            { header: 'URL Bukti', key: 'url_bukti', width: 40 }
        ];

        const transactions = await Kas.getAll();
        transactions.forEach(t => {
            const url = t.bukti_foto ? `${req.protocol}://${req.get('host')}/uploads/keuangan/${t.bukti_foto}` : '';
            sheet1.addRow({
                tanggal: moment(t.tanggal).format('YYYY-MM-DD'),
                keterangan: t.keterangan,
                tipe: t.tipe,
                debit: t.tipe === 'masuk' ? t.jumlah : 0,
                kredit: t.tipe === 'keluar' ? t.jumlah : 0,
                url_bukti: url
            });
        });

        // --- SHEET 2: Data Warga ---
        const sheet2 = workbook.addWorksheet('Data Warga');
        sheet2.columns = [
            { header: 'Nama', key: 'nama', width: 30 },
            { header: 'Blok', key: 'blok', width: 10 },
            { header: 'Nomor', key: 'nomor_rumah', width: 10 },
            { header: 'Status Keluarga', key: 'status_keluarga', width: 15 },
            { header: 'No. HP', key: 'no_hp', width: 20 },
            { header: 'Status Huni', key: 'status_huni', width: 15 },
            { header: 'Ronda?', key: 'is_ronda', width: 10 }
        ];

        const warga = await Warga.getAll();
        warga.forEach(w => {
            sheet2.addRow({
                nama: w.nama,
                blok: w.blok,
                nomor_rumah: w.nomor_rumah,
                status_keluarga: w.status_keluarga,
                no_hp: w.no_hp,
                status_huni: w.status_huni,
                is_ronda: w.is_ronda ? 'Ya' : 'Tidak'
            });
        });

        // --- SHEET 3: Status Pembayaran (Iuran) ---
        const sheet3 = workbook.addWorksheet('Status Pembayaran');
        sheet3.columns = [
            { header: 'Nama Warga', key: 'nama', width: 30 },
            { header: 'Blok/No', key: 'rumah', width: 15 },
            { header: 'Periode', key: 'periode', width: 15 },
            { header: 'Jenis', key: 'jenis', width: 15 },
            { header: 'Jumlah', key: 'jumlah', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Tanggal Bayar', key: 'tanggal_bayar', width: 20 },
            { header: 'URL Bukti', key: 'url_bukti', width: 40 }
        ];

        const iurans = await Iuran.getAll();
        iurans.forEach(i => {
            // Asumsi bukti bayar iuran mungkin ada di folder berbeda?
            // controller/iuranController.js upload ke: ./public/uploads/bukti/
            const url = i.bukti_bayar ? `${req.protocol}://${req.get('host')}/uploads/bukti/${i.bukti_bayar}` : '';
            sheet3.addRow({
                nama: i.nama,
                rumah: `${i.blok}/${i.nomor_rumah}`,
                periode: moment(i.periode).format('MMM YYYY'),
                jenis: i.jenis,
                jumlah: i.jumlah,
                status: i.status,
                tanggal_bayar: i.tanggal_bayar ? moment(i.tanggal_bayar).format('YYYY-MM-DD HH:mm') : '-',
                url_bukti: url
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Laporan_Keuangan_Warga.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal export data');
        res.redirect('/keuangan');
    }
};

exports.getDetailByProof = async (req, res) => {
    try {
        const { filename } = req.params;

        // 1. Get Iuran Details (Main Info)
        const iuranDetail = await Iuran.getByProof(filename);

        // 2. Get Related Kas Transactions
        const kasTransactions = await Kas.getByProof(filename);

        if (!iuranDetail && kasTransactions.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        const data = {
            iuran: iuranDetail || null,
            kas: kasTransactions
        };

        res.json({ success: true, data });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.viewDetail = async (req, res) => {
    try {
        const { filename } = req.params;

        // 1. Get Iuran Details (Main Info)
        const iuranDetail = await Iuran.getByProof(filename);

        // 2. Get Related Kas Transactions
        const kasTransactions = await Kas.getByProof(filename);

        if (!iuranDetail && kasTransactions.length === 0) {
            req.flash('error_msg', 'Data transaksi tidak ditemukan.');
            return res.redirect('/keuangan');
        }

        res.render('keuangan/detail', {
            title: 'Detail Transaksi',
            user: req.session.user,
            iuran: iuranDetail || null,
            kas: kasTransactions,
            moment: moment
        });

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Terjadi kesalahan sistem.');
        res.redirect('/keuangan');
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Kas.getById(id);

        if (!transaction) {
            req.flash('error_msg', 'Data tidak ditemukan');
            return res.redirect('/keuangan');
        }

        await Kas.delete(id);

        req.flash('success_msg', 'Transaksi berhasil dihapus');
        res.redirect('/keuangan');

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menghapus transaksi');
        res.redirect('/keuangan');
    }
};
