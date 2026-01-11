const Iuran = require('../models/Iuran');
const ExcelJS = require('exceljs');
const Warga = require('../models/Warga');
const Kas = require('../models/Kas');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const db = require('../config/db'); // Direct DB access for transactions/custom queries

// Multer Config
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('bukti_bayar');

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

exports.index = async (req, res) => {
    try {
        const year = req.query.year || moment().format('YYYY');

        // Get Heads of Family only (for Matrix Rows)
        const warga = await Warga.getHeadsOfFamily();

        // Get Iuran for selected Year
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE YEAR(i.periode) = ?
            ORDER BY w.blok ASC, w.nomor_rumah ASC, i.periode DESC
        `, [year]);

        // Group for Grid View (List Card)
        const groupedIuran = {};
        rows.forEach(item => {
            const key = `${item.warga_id}-${moment(item.periode).format('YYYY-MM')}`;
            if (!groupedIuran[key]) {
                groupedIuran[key] = {
                    warga_id: item.warga_id,
                    nama: item.nama,
                    blok: item.blok,
                    nomor_rumah: item.nomor_rumah,
                    periode: item.periode,
                    kas: null,
                    sampah: null
                };
            }
            if (item.jenis === 'keamanan' || item.jenis === 'kas') {
                groupedIuran[key].kas = item;
            } else if (item.jenis === 'sampah') {
                groupedIuran[key].sampah = item;
            }
        });
        const iuranList = Object.values(groupedIuran);

        // Build Matrix for Table View
        const matrix = {};
        warga.forEach(w => {
            matrix[w.id] = Array(12).fill(null).map(() => ({ kas: null, sampah: null }));
        });

        rows.forEach(r => {
            if (matrix[r.warga_id]) {
                const idx = moment(r.periode).month(); // 0-11
                const type = (r.jenis === 'keamanan' || r.jenis === 'kas') ? 'kas' : 'sampah';
                matrix[r.warga_id][idx][type] = r;
            }
        });

        res.render('iuran/index', {
            title: 'Data Iuran',
            iuran: iuranList,
            matrix,
            warga,
            year,
            moment,
            user: req.session.user,
            useWideContainer: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.generate = async (req, res) => {
    try {
        const currentMonth = moment().startOf('month').format('YYYY-MM-DD');
        const count = await Iuran.generateBillsForMonth(currentMonth);
        req.flash('success_msg', `Berhasil generate ${count} tagihan untuk bulan ini.`);
        res.redirect('/iuran');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal generate tagihan');
        res.redirect('/iuran');
    }
};

exports.payForm = async (req, res) => {
    try {
        let warga;

        // If user is regular warga (not admin/bendahara/ketua), show only their own house
        if (req.session.user.role === 'warga' && req.session.user.warga_id) {
            const [rows] = await db.query('SELECT * FROM warga WHERE id = ?', [req.session.user.warga_id]);
            warga = rows;
        } else {
            // Admin/bendahara/ketua can see all houses
            warga = await Warga.getHeadsOfFamily();
        }

        res.render('iuran/pay', {
            title: 'Bayar Iuran',
            warga,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.redirect('/iuran');
    }
};

exports.processPayment = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/iuran/pay');
        } else {
            try {
                let { warga_id, months, jenis_iuran } = req.body;

                const selectedMonths = Array.isArray(months) ? months : (months ? [months] : []);
                const jenis = Array.isArray(jenis_iuran) ? jenis_iuran : (jenis_iuran ? [jenis_iuran] : []);

                if (selectedMonths.length === 0) {
                    req.flash('error_msg', 'Pilih minimal satu bulan');
                    return res.redirect('/iuran/pay');
                }

                if (jenis.length === 0) {
                    req.flash('error_msg', 'Pilih minimal satu jenis pembayaran');
                    return res.redirect('/iuran/pay');
                }

                let bukti = req.file ? req.file.filename : null;
                const jumlahPerItem = 25000;

                for (const m of selectedMonths) {
                    const currentPeriode = m + '-01';

                    for (const jenisItem of jenis) {
                        const [existing] = await db.query(
                            'SELECT * FROM iuran WHERE warga_id = ? AND periode = ? AND jenis = ?',
                            [warga_id, currentPeriode, jenisItem]
                        );

                        if (existing.length > 0) {
                            if (existing[0].status === 'lunas') continue;
                            await db.query(
                                'UPDATE iuran SET jumlah = ?, status = ?, bukti_bayar = ?, tanggal_bayar = NOW() WHERE id = ?',
                                [jumlahPerItem, 'menunggu_konfirmasi', bukti, existing[0].id]
                            );
                        } else {
                            await db.query(
                                'INSERT INTO iuran (warga_id, periode, jenis, jumlah, status, bukti_bayar, tanggal_bayar) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                                [warga_id, currentPeriode, jenisItem, jumlahPerItem, 'menunggu_konfirmasi', bukti]
                            );
                        }
                    }
                }

                req.flash('success_msg', `Pembayaran untuk ${selectedMonths.length} bulan berhasil diinput.`);
                res.redirect('/iuran');

            } catch (error) {
                console.error('Payment error:', error);
                req.flash('error_msg', 'Gagal memproses pembayaran: ' + error.message);
                res.redirect('/iuran');
            }
        }
    });
};

exports.confirm = async (req, res) => {
    try {
        const { id } = req.params;

        // Get bill details with Warga info
        const [rows] = await db.query(`
            SELECT i.*, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.id = ?
        `, [id]);

        if (rows.length === 0) {
            req.flash('error_msg', 'Tagihan tidak ditemukan');
            return res.redirect('/iuran');
        }
        const bill = rows[0];

        if (bill.status === 'lunas') {
            req.flash('error_msg', 'Tagihan sudah lunas');
            return res.redirect('/iuran');
        }

        await Iuran.updateStatus(id, 'lunas');

        // Add to Kas with Block/House Number
        const ket = `Iuran Warga ${bill.blok}/${bill.nomor_rumah} Periode:${moment(bill.periode).format('MMM YYYY')}`;
        await Kas.add('masuk', bill.jumlah, ket, moment().format('YYYY-MM-DD'), bill.bukti_bayar);

        req.flash('success_msg', 'Pembayaran dikonfirmasi lunas dan masuk kas.');
        res.redirect('/iuran');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal konfirmasi');
        res.redirect('/iuran');
    }
};

exports.arrears = async (req, res) => {
    try {
        const tunggakan = await Iuran.getTunggakan();
        res.render('iuran/arrears', { title: 'Laporan Tunggakan', tunggakan, moment });
    } catch (err) {
        console.error(err);
        res.redirect('/iuran');
    }

};

const QrisGenerator = require('../utils/QrisGenerator');

exports.checkStatus = async (req, res) => {
    try {
        const { warga_id, year, month } = req.body;

        let query = "SELECT jenis, status, DATE_FORMAT(periode, '%Y-%m') as ym FROM iuran WHERE warga_id = ?";
        let params = [warga_id];

        if (year) {
            query += " AND YEAR(periode) = ?";
            params.push(year);
        } else if (month) {
            query += " AND periode = ?";
            params.push(moment(month + '-01').format('YYYY-MM-DD'));
        }

        const [rows] = await db.query(query, params);
        res.json({ success: true, items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
};

exports.generateQris = (req, res) => {
    try {
        const { amount, merchantName } = req.body;
        const baseString = process.env.STATIC_QRIS || "00020101021126570011ID.DANA.WWW011893600915319034402102091903440210303UMI51440014ID.CO.QRIS.WWW0215ID10254440170380303UMI5204573253033605802ID5914Endri Susanto 6015Kabupaten Bekas6105175406304CAAF";

        const qris = new QrisGenerator(baseString);
        qris.setAmount(amount);
        if (merchantName) {
            // User requested robust naming format, allowing full length (Standard supports it)
            qris.setMerchantName(merchantName);
        }

        const qrString = qris.generate();
        res.json({ success: true, qr_string: qrString });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.control = async (req, res) => {
    try {
        const year = req.query.year || moment().format('YYYY');
        // Get all warga sorted by blok/no
        const warga = await Warga.getAll();

        // Get bills for the year
        const [rows] = await db.query(`
            SELECT warga_id, MONTH(periode) as bulan_num, jenis, status 
            FROM iuran 
            WHERE YEAR(periode) = ?
        `, [year]);

        // Initialize Matrix: wargaId -> Array[12] -> { kas: null, sampah: null }
        const matrix = {};
        warga.forEach(w => {
            matrix[w.id] = [];
            for (let i = 0; i < 12; i++) {
                // null = no bill, 'lunas', 'menunggu_konfirmasi', etc.
                matrix[w.id].push({ kas: null, sampah: null });
            }
        });

        // Fill Matrix
        rows.forEach(r => {
            if (matrix[r.warga_id]) {
                const idx = r.bulan_num - 1; // 0-11
                if (idx >= 0 && idx < 12) {
                    const type = (r.jenis === 'keamanan' || r.jenis === 'kas') ? 'kas' : 'sampah';
                    matrix[r.warga_id][idx][type] = r.status;
                }
            }
        });

        res.render('iuran/control', {
            title: 'Monitoring Pembayaran Iuran',
            warga,
            matrix,
            year,
            user: req.session.user
        });

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat data kontrol');
        res.redirect('/iuran');
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            ORDER BY i.periode DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Iuran');

        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Periode', key: 'periode', width: 15 },
            { header: 'Nama Warga', key: 'nama', width: 25 },
            { header: 'Blok', key: 'blok', width: 8 },
            { header: 'No Rumah', key: 'nomor_rumah', width: 10 },
            { header: 'Jenis', key: 'jenis', width: 15 },
            { header: 'Jumlah', key: 'jumlah', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Tgl Bayar', key: 'tanggal_bayar', width: 20 }
        ];

        rows.forEach((row, index) => {
            worksheet.addRow({
                no: index + 1,
                periode: moment(row.periode).format('MMMM YYYY'),
                nama: row.nama,
                blok: row.blok,
                nomor_rumah: row.nomor_rumah,
                jenis: row.jenis,
                jumlah: row.jumlah,
                status: row.status,
                tanggal_bayar: row.tanggal_bayar ? moment(row.tanggal_bayar).format('DD-MM-YYYY HH:mm') : '-'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'data_iuran.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal export excel');
        res.redirect('/iuran');
    }
};
