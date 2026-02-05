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
        const iuranList = await Iuran.getByProof(filename);
        let iuranDetail = null;

        if (Array.isArray(iuranList) && iuranList.length > 0) {
            iuranDetail = iuranList[0];
            
            // Combine types nice look
            const uniqueTypes = [...new Set(iuranList.map(item => item.jenis))];
            const readableTypes = uniqueTypes.map(t => {
                if (t === 'kas_rt') return 'Kas RT';
                if (t === 'kas_gang') return 'Kas Gang';
                if (t === 'sampah') return 'Sampah';
                return t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            });
            
            iuranDetail.jenis = readableTypes.join(', ');
        }

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
exports.statistik = async (req, res) => {
    try {
        // 1. Keuangan Summary
        const saldo = await Kas.getBalance();
        const transactions = await Kas.getAll(); 
        const currentMonth = moment().format('YYYY-MM');
        
        // Filter transactions for this month
        const thisMonthTrans = transactions.filter(t => moment(t.tanggal).format('YYYY-MM') === currentMonth);
        
        const pemasukanBulanIni = thisMonthTrans
            .filter(t => t.tipe === 'masuk')
            .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        const pengeluaranBulanIni = thisMonthTrans
            .filter(t => t.tipe === 'keluar')
            .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        // 2. Piutang / Tunggakan Logic
        const tunggakanData = await Iuran.getTunggakan();
        
        // Group by House
        const groupedByHouse = {};
        let totalPiutang = 0;
        
        tunggakanData.forEach(item => {
            const key = `${item.blok}-${item.nomor_rumah}`;
            if (!groupedByHouse[key]) {
                groupedByHouse[key] = {
                    blok: item.blok,
                    nomor_rumah: item.nomor_rumah,
                    nama: item.nama, // Head of family or representative
                    total: 0,
                    items: []
                };
            }
            groupedByHouse[key].total += Number(item.jumlah);
            groupedByHouse[key].items.push(item);
            totalPiutang += Number(item.jumlah);
        });
        
        // Convert to array and sort by Total Debt DESC
        const piutangList = Object.values(groupedByHouse).sort((a,b) => b.total - a.total);

        // Render standalone view (no default layout to allow custom full-screen scrolling)
        res.render('keuangan/statistik', {
            layout: false, 
            title: 'Live Statistik',
            saldo,
            pemasukanBulanIni,
            pengeluaranBulanIni,
            totalPiutang,
            piutangList,
            moment
        });

    } catch (err) {
        console.error('Error in statistik:', err);
        res.status(500).send('Server Error');
    }
};

exports.sync = async (req, res) => {
    try {
        // Role check
        if (!req.session.user || !['admin', 'bendahara'].includes(req.session.user.role)) {
            if(req.xhr) return res.status(403).json({ success: false, message: 'Unauthorized' });
            req.flash('error_msg', 'Unauthorized');
            return res.redirect('/keuangan');
        }

        console.log('Starting Kas Synchronization...');

        // 1. Delete old auto-generated iuran entries from kas
        // Pattern: 'Iuran Warga%' (Standard format generated in iuranController)
        await db.query(`DELETE FROM kas WHERE tipe = 'masuk' AND keterangan LIKE 'Iuran Warga%'`);

        // 2. Fetch all PAID iuran
        const [paidIurans] = await db.query(`
            SELECT i.*, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.status = 'lunas'
        `);

        // 3. Re-insert to kas
        let count = 0;
        // Use loop to avoid overload connection pool
        for (const bill of paidIurans) {
            let jenisLabel = '';
            // Map jenis to readable label
            switch(bill.jenis) {
                case 'kas_rt': jenisLabel = 'Kas RT'; break;
                case 'kas_gang': jenisLabel = 'Kas Gang'; break;
                case 'sampah': jenisLabel = 'Kebersihan'; break; // User said 'Sampah', usually kebersihan is nicer, but let's stick to what user sees or expects
                default: jenisLabel = bill.jenis; 
            }
            if(bill.jenis === 'sampah') jenisLabel = 'Sampah'; // Explicit override to match user request

            const ket = `Iuran Warga ${bill.blok}/${bill.nomor_rumah} Periode:${moment(bill.periode).format('MMM YYYY')} [${jenisLabel}]`;
            
            // Prioritize tanggal_bayar (User payment timestamp) as requested
            const kasDate = bill.tanggal_bayar || bill.tanggal_konfirmasi || new Date();
            
            await Kas.add('masuk', bill.jumlah, ket, kasDate, bill.bukti_bayar);
            count++;
        }

        const msg = `Berhasil sinkronisasi. ${count} data pembayaran telah dicatat ulang di Kas.`;
        console.log(msg);

        // Jika request AJAX
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.json({ success: true, message: msg });
        }
        
        req.flash('success_msg', msg);
        res.redirect('/keuangan');

    } catch (err) {
        console.error('Error syncing kas:', err);
        if (req.xhr) return res.status(500).json({ success: false, message: err.message });
        req.flash('error_msg', 'Gagal sinkronisasi data.');
        res.redirect('/keuangan');
    }
};
