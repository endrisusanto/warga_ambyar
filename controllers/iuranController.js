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
    const runQuery = async () => {
        const year = req.query.year || moment().format('YYYY');

        // Get Heads of Family only (for Matrix Rows)
        const warga = await Warga.getHeadsOfFamily();

        // Get Iuran for selected Year
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.blok, w.nomor_rumah,
                   (SELECT status_huni FROM warga w2 
                    WHERE w2.blok = w.blok AND w2.nomor_rumah = w.nomor_rumah 
                    ORDER BY FIELD(status_huni, 'kontrak', 'tetap', 'kosong', 'tidak huni') LIMIT 1) as effective_status_huni,
                   p.nama as payer_name
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            LEFT JOIN warga p ON i.dibayar_oleh = p.id
            WHERE YEAR(i.periode) = ?
            ORDER BY w.blok ASC, w.nomor_rumah ASC, i.periode DESC
        `, [year]);

        return { rows, warga, year };
    };

    try {
        try {
            const data = await runQuery();
            renderIndex(req, res, data);
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage.includes('dibayar_oleh')) {
                console.log('Column dibayar_oleh missing, attempting to migrate...');
                await db.query("ALTER TABLE iuran ADD COLUMN dibayar_oleh INT DEFAULT NULL");
                await db.query("ALTER TABLE iuran ADD CONSTRAINT fk_iuran_payer FOREIGN KEY (dibayar_oleh) REFERENCES warga(id) ON DELETE SET NULL");
                console.log('Migration successful, retrying query...');
                const data = await runQuery();
                renderIndex(req, res, data);
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error: ' + err.message);
    }
};

function renderIndex(req, res, { rows, warga, year }) {
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
                status_huni: item.effective_status_huni,
                periode: item.periode,
                kas_rt: null,
                kas_gang: null,
                sampah: null
            };
        }
        // Group by type: kas_rt, kas_gang, sampah
        if (item.jenis === 'keamanan' || item.jenis === 'kas' || item.jenis === 'kas_rt') {
            groupedIuran[key].kas_rt = item;
        } else if (item.jenis === 'kas_gang') {
            groupedIuran[key].kas_gang = item;
        } else if (item.jenis === 'sampah') {
            groupedIuran[key].sampah = item;
        }
    });
    const iuranList = Object.values(groupedIuran);

    // Build Matrix for Table View (3 columns now)
    const matrix = {};
    warga.forEach(w => {
        matrix[w.id] = Array(12).fill(null).map(() => ({ kas_rt: null, kas_gang: null, sampah: null }));
    });

    rows.forEach(r => {
        if (matrix[r.warga_id]) {
            const idx = moment(r.periode).month(); // 0-11
            let type = 'sampah';
            if (r.jenis === 'keamanan' || r.jenis === 'kas' || r.jenis === 'kas_rt') {
                type = 'kas_rt';
            } else if (r.jenis === 'kas_gang') {
                type = 'kas_gang';
            }
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
        useWideContainer: true,
        newPaymentWaUrl: req.flash('new_payment_wa_url')[0],
        allTransactions: rows
    });
}

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

        // If user is regular warga (not admin/bendahara/ketua), show only their own house (Head of Family)
        if (req.session.user.role === 'warga' && req.session.user.warga_id) {
            // Find the Head of Family for this user's house
            const [rows] = await db.query(`
                SELECT w.* 
                FROM warga w
                JOIN warga u ON w.blok = u.blok AND w.nomor_rumah = u.nomor_rumah
                WHERE u.id = ? AND w.status_keluarga = 'Kepala Keluarga'
            `, [req.session.user.warga_id]);

            if (rows.length > 0) {
                warga = rows;
            } else {
                // Fallback: just show the user themselves if no Head found
                const [self] = await db.query('SELECT * FROM warga WHERE id = ?', [req.session.user.warga_id]);
                warga = self;
            }
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

                console.log('=== PAYMENT SUBMISSION ===');
                console.log('Raw jenis_iuran:', jenis_iuran);

                const selectedMonths = Array.isArray(months) ? months : (months ? [months] : []);
                const jenis = Array.isArray(jenis_iuran) ? jenis_iuran : (jenis_iuran ? [jenis_iuran] : []);

                console.log('Processed jenis:', jenis);
                console.log('Selected months:', selectedMonths);

                if (selectedMonths.length === 0) {
                    req.flash('error_msg', 'Pilih minimal satu bulan');
                    return res.redirect('/iuran/pay');
                }

                if (jenis.length === 0) {
                    req.flash('error_msg', 'Pilih minimal satu jenis pembayaran');
                    return res.redirect('/iuran/pay');
                }

                // Security Check: Can this user pay for this warga_id?
                let payer_id = null;
                if (req.session.user.role === 'warga') {
                    payer_id = req.session.user.warga_id;
                    // Check if they are in the same house
                    const [check] = await db.query(`
                        SELECT 1 
                        FROM warga target
                        JOIN warga payer ON target.blok = payer.blok AND target.nomor_rumah = payer.nomor_rumah
                        WHERE target.id = ? AND payer.id = ?
                    `, [warga_id, payer_id]);

                    if (check.length === 0) {
                        req.flash('error_msg', 'Anda tidak berhak melakukan pembayaran untuk warga ini.');
                        return res.redirect('/iuran/pay');
                    }
                } else if (req.session.user.warga_id) {
                    // Admin/Bendahara also records who paid if they are a warga
                    payer_id = req.session.user.warga_id;
                }

                let bukti = req.file ? req.file.filename : null;
                const bayarTime = req.body.tanggal_bayar || moment().format('YYYY-MM-DD HH:mm:ss');

                for (const m of selectedMonths) {
                    const currentPeriode = m + '-01';

                    for (const jenisItem of jenis) {
                        // Determine amount based on type
                        let jumlahPerItem = 25000; // default sampah
                        if (jenisItem === 'kas' || jenisItem === 'kas_rt' || jenisItem === 'kas_gang') {
                            jumlahPerItem = 10000;
                        } else if (jenisItem === 'sampah') {
                            jumlahPerItem = 25000;
                        }

                        console.log(`Processing payment: jenis=${jenisItem}, amount=${jumlahPerItem}`);

                        // Prevent Duplicates: Check by House (Blok & No Rumah) instead of just Warga ID
                        // 1. Get Blok/No of the submitted warga_id
                        const [wargaDetails] = await db.query('SELECT blok, nomor_rumah FROM warga WHERE id = ?', [warga_id]);

                        let existing = [];
                        if (wargaDetails.length > 0) {
                            const { blok, nomor_rumah } = wargaDetails[0];
                            // Find any bill for this house, period, and type
                            [existing] = await db.query(`
                                SELECT i.* 
                                FROM iuran i
                                JOIN warga w ON i.warga_id = w.id
                                WHERE w.blok = ? AND w.nomor_rumah = ? 
                                AND i.periode = ? AND i.jenis = ?
                            `, [blok, nomor_rumah, currentPeriode, jenisItem]);
                        }

                        if (existing.length > 0) {
                            if (existing[0].status === 'lunas') continue;
                            // Update existing record (even if warga_id was different, we update it to the current payer context or keep it)
                            // We should probably keep the original warga_id (Head of Family) or update it? 
                            // Let's keep original warga_id but update payment details.
                            await db.query(
                                'UPDATE iuran SET jumlah = ?, status = ?, bukti_bayar = ?, tanggal_bayar = ?, dibayar_oleh = ? WHERE id = ?',
                                [jumlahPerItem, 'menunggu_konfirmasi', bukti, bayarTime, payer_id, existing[0].id]
                            );
                        } else {
                            await db.query(
                                'INSERT INTO iuran (warga_id, periode, jenis, jumlah, status, bukti_bayar, tanggal_bayar, dibayar_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [warga_id, currentPeriode, jenisItem, jumlahPerItem, 'menunggu_konfirmasi', bukti, bayarTime, payer_id]
                            );
                        }
                    }
                }

                // Get admin phone number
                const getAdminContact = require('../utils/getAdminContact');
                const adminPhone = await getAdminContact();

                // Get warga name for the message
                const [wargaInfo] = await db.query('SELECT nama, blok, nomor_rumah FROM warga WHERE id = ?', [warga_id]);
                const wargaName = wargaInfo[0] ? wargaInfo[0].nama : 'Warga';
                const rumah = wargaInfo[0] ? `${wargaInfo[0].blok}/${wargaInfo[0].nomor_rumah}` : '';

                // Construct WhatsApp message
                const jenisText = jenis.map(j => {
                    if (j === 'kas' || j === 'kas_rt') return 'Kas RT';
                    if (j === 'kas_gang') return 'Kas Gang';
                    return 'Sampah';
                }).join(' & ');
                const monthsText = selectedMonths.map(m => moment(m, 'YYYY-MM').format('MMM YYYY')).join(', ');
                const message = `Halo Admin, saya ${wargaName} (${rumah}) sudah melakukan pembayaran iuran ${jenisText} untuk bulan: ${monthsText}. Mohon verifikasi. Terima kasih.`;
                const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;

                req.flash('success_msg', `Pembayaran untuk ${selectedMonths.length} bulan berhasil diinput.`);
                req.flash('new_payment_wa_url', waUrl);
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
        const kasDate = bill.tanggal_bayar ? moment(bill.tanggal_bayar).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
        await Kas.add('masuk', bill.jumlah, ket, kasDate, bill.bukti_bayar);

        // Get warga phone and name for WhatsApp notification
        const [wargaData] = await db.query('SELECT nama, no_hp FROM warga WHERE id = ?', [bill.warga_id]);

        if (wargaData.length > 0 && wargaData[0].no_hp) {
            const wargaPhone = wargaData[0].no_hp.replace(/^0/, '62').replace(/\D/g, '');
            const wargaName = wargaData[0].nama;
            let jenisName = 'Sampah';
            if (bill.jenis === 'kas' || bill.jenis === 'kas_rt') {
                jenisName = 'Kas RT';
            } else if (bill.jenis === 'kas_gang') {
                jenisName = 'Kas Gang';
            }
            const message = `Halo ${wargaName}, pembayaran iuran ${jenisName} untuk periode ${moment(bill.periode).format('MMMM YYYY')} sebesar Rp ${bill.jumlah.toLocaleString('id-ID')} telah diverifikasi dan diterima. Terima kasih!`;
            const waUrl = `https://wa.me/${wargaPhone}?text=${encodeURIComponent(message)}`;

            req.flash('success_msg', 'Pembayaran dikonfirmasi lunas dan masuk kas.');
            req.flash('new_payment_wa_url', waUrl);
            res.redirect('/iuran');
        } else {
            req.flash('success_msg', 'Pembayaran dikonfirmasi lunas dan masuk kas.');
            res.redirect('/iuran');
        }
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal konfirmasi');
        res.redirect('/iuran');
    }
};

exports.reject = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify existence and get warga info
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.no_hp 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.id = ?
        `, [id]);

        if (rows.length === 0) {
            req.flash('error_msg', 'Tagihan tidak ditemukan');
            return res.redirect('/iuran');
        }

        const bill = rows[0];

        await db.query('UPDATE iuran SET status = ?, bukti_bayar = NULL WHERE id = ?', ['ditolak', id]);

        // Send WhatsApp notification to warga
        if (bill.no_hp) {
            const wargaPhone = bill.no_hp.replace(/^0/, '62').replace(/\D/g, '');
            let jenisName = 'Sampah';
            if (bill.jenis === 'kas' || bill.jenis === 'kas_rt') {
                jenisName = 'Kas RT';
            } else if (bill.jenis === 'kas_gang') {
                jenisName = 'Kas Gang';
            }
            const message = `Halo ${bill.nama}, pembayaran iuran ${jenisName} untuk periode ${moment(bill.periode).format('MMMM YYYY')} ditolak. Mohon upload ulang bukti pembayaran yang valid. Terima kasih.`;
            const waUrl = `https://wa.me/${wargaPhone}?text=${encodeURIComponent(message)}`;

            req.flash('success_msg', 'Pembayaran ditolak. Warga harus upload ulang.');
            req.flash('new_payment_wa_url', waUrl);
            res.redirect('/iuran');
        } else {
            req.flash('success_msg', 'Pembayaran ditolak. Warga harus upload ulang.');
            res.redirect('/iuran');
        }
    } catch (err) {
        console.error('Reject Payment Error:', err);
        req.flash('error_msg', 'Gagal menolak pembayaran: ' + err.message);
        res.redirect('/iuran');
    }
};

exports.arrears = async (req, res) => {
    try {
        const tunggakan = await Iuran.getTunggakan();
        const allWarga = await Warga.getAll();
        res.render('iuran/arrears', { title: 'Laporan Tunggakan', tunggakan, allWarga, moment, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.redirect('/iuran');
    }
};

exports.exportArrearsExcel = async (req, res) => {
    try {
        const tunggakan = await Iuran.getTunggakan();
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Tunggakan');

        // Columns
        worksheet.columns = [
            { header: 'Nama Warga', key: 'nama', width: 25 },
            { header: 'Blok/No', key: 'rumah', width: 15 },
            { header: 'Periode', key: 'periode', width: 15 },
            { header: 'Jenis Iuran', key: 'jenis', width: 15 },
            { header: 'Jumlah', key: 'jumlah', width: 15 },
            { header: 'Status', key: 'status', width: 20 }
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEEEEEE' }
        };

        // Add Data
        let total = 0;
        tunggakan.forEach(item => {
            let jenisLabel = 'Sampah';
            if (item.jenis === 'kas_rt') jenisLabel = 'Kas RT';
            if (item.jenis === 'kas_gang') jenisLabel = 'Kas Gang';

            worksheet.addRow({
                nama: item.nama,
                rumah: `${item.blok}/${item.nomor_rumah}`,
                periode: moment(item.periode).format('MMM YYYY'),
                jenis: jenisLabel,
                jumlah: parseFloat(item.jumlah),
                status: item.status.replace('_', ' ').toUpperCase()
            });
            total += parseFloat(item.jumlah);
        });

        // Total Row
        worksheet.addRow({});
        const totalRow = worksheet.addRow({
            nama: 'TOTAL TUNGGAKAN',
            jumlah: total
        });
        totalRow.font = { bold: true, color: { argb: 'FFFF0000' } };

        // Response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Laporan_Tunggakan.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal export Excel');
        res.redirect('/iuran/arrears');
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

exports.cleanupDuplicates = async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).send('Unauthorized');
        }

        // 1. Existing cleanup (Kas -> Kas RT)
        const [oldKas] = await db.query("SELECT * FROM iuran WHERE jenis = 'kas' OR jenis = 'keamanan'");
        let deleted = 0;
        let migrated = 0;

        for (const item of oldKas) {
            // Use DATE() to compare dates ignoring time
            const [existing] = await db.query(
                "SELECT id FROM iuran WHERE warga_id = ? AND DATE(periode) = DATE(?) AND jenis = 'kas_rt'",
                [item.warga_id, item.periode]
            );

            if (existing.length > 0) {
                await db.query("DELETE FROM iuran WHERE id = ?", [item.id]);
                deleted++;
            } else {
                await db.query("UPDATE iuran SET jenis = 'kas_rt' WHERE id = ?", [item.id]);
                migrated++;
            }
        }

        // 2. House-Level Duplicate Cleanup
        // Find duplicates based on House + Period + Type (only unpaid)
        const [duplicates] = await db.query(`
            SELECT i.id, i.warga_id, i.periode, i.jenis, w.blok, w.nomor_rumah, w.status_keluarga
            FROM iuran i
            JOIN warga w ON i.warga_id = w.id
            WHERE i.status != 'lunas'
        `);

        // Group by House+Period+Type
        const groups = {};
        duplicates.forEach(d => {
            const key = `${d.blok}-${d.nomor_rumah}-${moment(d.periode).format('YYYY-MM')}-${d.jenis}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(d);
        });

        let houseDuplicatesDeleted = 0;
        for (const key in groups) {
            const items = groups[key];
            if (items.length > 1) {
                // Sort to keep the best one: Prioritize 'Kepala Keluarga', then lowest ID
                items.sort((a, b) => {
                    if (a.status_keluarga === 'Kepala Keluarga' && b.status_keluarga !== 'Kepala Keluarga') return -1;
                    if (b.status_keluarga === 'Kepala Keluarga' && a.status_keluarga !== 'Kepala Keluarga') return 1;
                    return a.id - b.id;
                });

                // Keep items[0], delete the rest
                const toDelete = items.slice(1);
                for (const d of toDelete) {
                    await db.query("DELETE FROM iuran WHERE id = ?", [d.id]);
                    houseDuplicatesDeleted++;
                }
            }
        }

        req.flash('success_msg', `Cleanup complete. Legacy Deleted: ${deleted}, Migrated: ${migrated}, House Duplicates Deleted: ${houseDuplicatesDeleted}.`);
        res.redirect('/iuran/arrears');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Cleanup failed: ' + err.message);
        res.redirect('/iuran/arrears');
    }
};

exports.resetPayment = async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const { id } = req.body;

        // Delete the iuran record to reset to "Belum Ditagih"
        await db.query('DELETE FROM iuran WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
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

        // Initialize Matrix: wargaId -> Array[12] -> { kas_rt: null, kas_gang: null, sampah: null }
        const matrix = {};
        warga.forEach(w => {
            matrix[w.id] = [];
            for (let i = 0; i < 12; i++) {
                // null = no bill, 'lunas', 'menunggu_konfirmasi', etc.
                matrix[w.id].push({ kas_rt: null, kas_gang: null, sampah: null });
            }
        });

        // Fill Matrix
        rows.forEach(r => {
            if (matrix[r.warga_id]) {
                const idx = r.bulan_num - 1; // 0-11
                if (idx >= 0 && idx < 12) {
                    let type = 'sampah';
                    if (r.jenis === 'keamanan' || r.jenis === 'kas' || r.jenis === 'kas_rt') {
                        type = 'kas_rt';
                    } else if (r.jenis === 'kas_gang') {
                        type = 'kas_gang';
                    }
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
            { header: 'Tgl Bayar', key: 'tanggal_bayar', width: 20 },
            { header: 'Tgl Approved', key: 'tanggal_konfirmasi', width: 20 }
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
                tanggal_bayar: row.tanggal_bayar ? moment(row.tanggal_bayar).format('DD-MM-YYYY HH:mm') : '-',
                tanggal_konfirmasi: row.tanggal_konfirmasi ? moment(row.tanggal_konfirmasi).format('DD-MM-YYYY HH:mm') : '-'
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

exports.getPendingItems = async (req, res) => {
    try {
        const { warga_id } = req.body;
        const [rows] = await db.query(`
            SELECT * FROM iuran 
            WHERE warga_id = ? AND status = 'menunggu_konfirmasi'
            ORDER BY periode ASC
        `, [warga_id]);
        res.json({ success: true, items: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.confirmBatch = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.json({ success: false, message: 'No IDs provided' });
        }

        // Fetch details
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.no_hp, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.id IN (${placeholders})
        `, ids);

        if (rows.length === 0) {
            return res.json({ success: false, message: 'Data not found' });
        }

        // Update Status
        await db.query(`UPDATE iuran SET status = 'lunas', tanggal_konfirmasi = NOW() WHERE id IN (${placeholders})`, ids);

        // Add to Kas
        for (const bill of rows) {
            let jenisLabel = bill.jenis;
            if (bill.jenis === 'kas_rt') jenisLabel = 'Kas RT';
            if (bill.jenis === 'kas_gang') jenisLabel = 'Kas Gang';

            const ket = `Iuran ${jenisLabel} ${bill.blok}/${bill.nomor_rumah} ${moment(bill.periode).format('MMM YYYY')}`;
            const kasDate = bill.tanggal_bayar ? moment(bill.tanggal_bayar).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
            await Kas.add('masuk', bill.jumlah, ket, kasDate, bill.bukti_bayar);
        }

        // Prepare Response (WA URL)
        const bill = rows[0];
        let waUrl = null;
        if (bill.no_hp) {
            const wargaPhone = bill.no_hp.replace(/^0/, '62').replace(/\D/g, '');
            const totalAmount = rows.reduce((sum, item) => sum + item.jumlah, 0);

            // Format details
            const periods = [...new Set(rows.map(r => moment(r.periode).format('MMM YY')))].join(', ');

            const message = `Halo ${bill.nama}, pembayaran iuran total Rp ${totalAmount.toLocaleString('id-ID')} (Periode: ${periods}) telah diverifikasi. Terima kasih!`;
            waUrl = `https://wa.me/${wargaPhone}?text=${encodeURIComponent(message)}`;
        }

        res.json({ success: true, waUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};
