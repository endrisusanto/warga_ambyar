const Iuran = require('../models/Iuran');
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
        const rawIuran = await Iuran.getAll();

        // Group by warga_id and periode
        const groupedIuran = {};

        rawIuran.forEach(item => {
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

        const iuranList = Object.values(groupedIuran).sort((a, b) => {
            // 1. Sort by Periode DESC (Newest first)
            if (a.periode > b.periode) return -1;
            if (a.periode < b.periode) return 1;

            // 2. Sort by Blok ASC (F7 first, then F8)
            if (a.blok < b.blok) return -1;
            if (a.blok > b.blok) return 1;

            // 3. Custom Sort by Nomor Rumah based on Blok
            const numA = parseInt(a.nomor_rumah);
            const numB = parseInt(b.nomor_rumah);

            if (a.blok === 'F7') {
                // F7: Largest to Smallest (DESC)
                return numB - numA;
            } else {
                // F8 (or others): Smallest to Largest (ASC)
                return numA - numB;
            }
        });

        res.render('iuran/index', {
            title: 'Data Iuran',
            iuran: iuranList,
            moment,
            user: req.session.user
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
        const warga = await Warga.getHeadsOfFamily();
        res.render('iuran/pay', { title: 'Bayar Iuran', warga });
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
                const { warga_id, bulan, jenis_iuran } = req.body;
                console.log('Payment data:', { warga_id, bulan, jenis_iuran });

                const periode = moment(bulan + '-01').format('YYYY-MM-DD');
                let bukti = req.file ? req.file.filename : null;

                // Handle single checkbox or array
                const jenis = Array.isArray(jenis_iuran) ? jenis_iuran : (jenis_iuran ? [jenis_iuran] : []);
                console.log('Jenis array:', jenis);

                if (jenis.length === 0) {
                    req.flash('error_msg', 'Pilih minimal satu jenis pembayaran');
                    return res.redirect('/iuran/pay');
                }

                // Process each payment type separately
                for (const jenisItem of jenis) {
                    const jumlah = 25000; // Both kas and sampah are 25k each
                    console.log('Processing:', jenisItem, jumlah);

                    // Check if bill exists for this type
                    const [existing] = await db.query(
                        'SELECT * FROM iuran WHERE warga_id = ? AND periode = ? AND jenis = ?',
                        [warga_id, periode, jenisItem]
                    );

                    if (existing.length > 0) {
                        // Update existing
                        console.log('Updating existing:', existing[0].id);
                        await db.query(
                            'UPDATE iuran SET jumlah = ?, status = ?, bukti_bayar = ?, tanggal_bayar = NOW() WHERE id = ?',
                            [jumlah, 'menunggu_konfirmasi', bukti, existing[0].id]
                        );
                    } else {
                        // Create new
                        console.log('Creating new iuran');
                        await db.query(
                            'INSERT INTO iuran (warga_id, periode, jenis, jumlah, status, bukti_bayar, tanggal_bayar) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                            [warga_id, periode, jenisItem, jumlah, 'menunggu_konfirmasi', bukti]
                        );
                    }
                }

                req.flash('success_msg', 'Pembayaran berhasil diinput, menunggu konfirmasi.');
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

        // Get bill details
        const [rows] = await db.query('SELECT * FROM iuran WHERE id = ?', [id]);
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

        // Add to Kas
        await Kas.add('masuk', bill.jumlah, `Iuran Warga ID:${bill.warga_id} Periode:${moment(bill.periode).format('MMM YYYY')}`, moment().format('YYYY-MM-DD'));

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
