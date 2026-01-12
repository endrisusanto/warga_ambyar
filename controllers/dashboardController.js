const Kas = require('../models/Kas');
const Warga = require('../models/Warga');
const Iuran = require('../models/Iuran');
const Ronda = require('../models/Ronda');

exports.index = async (req, res) => {
    console.log('===== DASHBOARD INDEX CALLED =====');
    const data = {
        title: 'Dashboard',
        saldo: 0,
        summary: { pemasukan: 0, pengeluaran: 0 },
        mapData: [],
        jadwalRonda: [],
        events: [],
        chartData: { labels: [], pemasukan: [], pengeluaran: [] },
        user: req.session.user
    };

    try {
        // 1. Kas Data
        try {
            data.saldo = await Kas.getBalance();
            data.summary = await Kas.getSummary();
            const trend = await Kas.getMonthlyTrend();
            data.chartData.labels = trend.map(t => t.bulan).reverse();
            data.chartData.pemasukan = trend.map(t => t.pemasukan).reverse();
            data.chartData.pengeluaran = trend.map(t => t.pengeluaran).reverse();
        } catch (e) {
            console.error('Error fetching Kas data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Kas: ${e.message}\n`);
        }

        // 2. Map Data
        try {
            // Map Data Preparation
            const allWarga = await Warga.getAll();
            // console.log('DEBUG: allWarga count:', allWarga.length); // Removed debug log
            // console.log('DEBUG: allWarga sample:', allWarga.slice(0, 2)); // Removed debug log
            // require('fs').appendFileSync('debug.log', `DEBUG: allWarga count: ${allWarga.length}\n`); // Removed debug log

            // Group by house
            const houses = {};
            allWarga.forEach(w => {
                const blok = w.blok ? w.blok.toString().trim().toUpperCase() : '';
                const nomor = w.nomor_rumah ? w.nomor_rumah.toString().trim() : '';
                const key = `${blok}-${nomor}`;

                if (!houses[key]) {
                    houses[key] = {
                        blok: blok,
                        nomor_rumah: nomor,
                        residents: [],
                        head: null
                    };
                }
                houses[key].residents.push(w);
                if (w.status_keluarga === 'Kepala Keluarga') {
                    houses[key].head = w;
                }
            });

            // Process each house
            for (const key in houses) {
                const house = houses[key];
                const head = house.head || house.residents[0]; // Fallback if no head defined

                // Determine status iuran
                let status_iuran = 'lunas';
                let unpaid_details = [];
                const iuranTarget = house.head || (house.residents.length > 0 ? house.residents[0] : null);
                if (iuranTarget) {
                    try {
                        status_iuran = await Iuran.getStatusByHouse(iuranTarget.id);
                        if (status_iuran === 'menunggak') {
                            unpaid_details = await Iuran.getUnpaidDetails(iuranTarget.id);
                        }
                    } catch (e) {
                        console.error(`Error fetching Iuran for ${key}:`, e.message);
                        require('fs').appendFileSync('debug.log', `ERROR Iuran for ${key}: ${e.message}\n`);
                    }
                }

                // Determine status huni
                let effective_status_huni = 'kosong';
                if (house.residents.length > 0) {
                    const statuses = house.residents.map(r => r.status_huni.toLowerCase());
                    if (statuses.includes('kontrak')) {
                        effective_status_huni = 'kontrak';
                    } else if (statuses.includes('tetap')) {
                        effective_status_huni = 'tetap';
                    } else if (statuses.includes('kosong')) {
                        effective_status_huni = 'kosong';
                    } else if (statuses.includes('tidak huni')) {
                        effective_status_huni = 'tidak huni';
                    }
                }

                data.mapData.push({
                    blok: house.blok ? house.blok.toUpperCase() : '',
                    nomor_rumah: house.nomor_rumah,
                    residents: house.residents,
                    head_name: head ? head.nama : 'Unknown',
                    status_huni: effective_status_huni,
                    status_iuran: status_iuran,
                    unpaid_details: unpaid_details
                });
            }


            console.log('MapData count:', data.mapData.length);
            console.log('Sample mapData:', data.mapData.slice(0, 3));
        } catch (e) {
            console.error('Error fetching Map data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Map: ${e.message}\n`);
        }

        // 3. Ronda Schedule
        try {
            // Ronda Schedule - get today's schedule or next
            let todaySchedule = await Ronda.getTodaySchedule();
            let isUpcoming = false;
            let scheduleDate = new Date();

            if (todaySchedule.length === 0) {
                todaySchedule = await Ronda.getNextSchedule();
                if (todaySchedule.length > 0) {
                    isUpcoming = true;
                    scheduleDate = new Date(todaySchedule[0].tanggal);
                }
            }

            // Format for display - group by day
            if (todaySchedule.length > 0) {
                const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const monthsMap = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                const dayName = daysMap[scheduleDate.getDay()];
                const dateStr = `${scheduleDate.getDate()} ${monthsMap[scheduleDate.getMonth()]}`;

                data.jadwalRonda.push({
                    day: isUpcoming ? `${dayName}, ${dateStr}` : 'Malam Ini',
                    petugas: todaySchedule,
                    date: scheduleDate,
                    isUpcoming: isUpcoming
                });
            }
        } catch (e) {
            console.error('Error fetching Ronda data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Ronda: ${e.message}\n`);
        }

        // 4. Events
        try {
            const Event = require('../models/Event');
            data.events = await Event.getUpcoming();
        } catch (e) {
            console.error('Error fetching Events:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Events: ${e.message}\n`);
        }

        res.render('dashboard/index', data);
    } catch (err) {
        console.error('CRITICAL_DASHBOARD_ERROR:', err);
        require('fs').appendFileSync('debug.log', `CRITICAL ERROR: ${err.message}\n${err.stack}\n`);
        res.render('dashboard/index', data);
    }
};

exports.addEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { title, description, date, location } = req.body;
        await Event.create({ title, description, date, location });
        req.flash('success_msg', 'Event berhasil ditambahkan');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menambahkan event');
        res.redirect('/dashboard');
    }
};

exports.editEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { id } = req.params;
        const { title, description, date, location } = req.body;
        await Event.update(id, { title, description, date, location });
        req.flash('success_msg', 'Event berhasil diperbarui');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memperbarui event');
        res.redirect('/dashboard');
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { id } = req.params;
        await Event.delete(id);
        req.flash('success_msg', 'Event berhasil dihapus');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menghapus event');
        res.redirect('/dashboard');
    }
};

// Share Event Logic
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const shareDir = './public/uploads/shares/events/';
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

const shareStorage = multer.diskStorage({
    destination: shareDir,
    filename: function (req, file, cb) {
        cb(null, 'event-share-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const uploadShare = multer({ storage: shareStorage }).single('image');

exports.uploadShareImage = (req, res) => {
    uploadShare(req, res, async (err) => {
        if (err) return res.json({ success: false, error: err.message });
        if (!req.file) return res.json({ success: false, error: 'No file uploaded' });

        try {
            const Event = require('../models/Event');
            // Check if we can link it to an event (optional, based on filename or passed ID if we adjust frontend)
            // For now, let's just create the share record.
            // Ideally we pass eventId in body.
            const eventId = req.body.eventId || null;

            const shareId = await Event.createShare(eventId, req.file.filename);
            res.json({ success: true, filename: req.file.filename, shareId });
        } catch (e) {
            console.error(e);
            res.json({ success: true, filename: req.file.filename }); // Fallback without DB record if error
        }
    });
};

exports.viewPublicEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const shareId = req.params.id;
        const share = await Event.getShare(shareId);

        if (!share) {
            return res.status(404).send('Link tidak valid atau sudah kadaluarsa');
        }

        const moment = require('moment');
        res.render('dashboard/public_event', {
            title: share.judul || 'Pengumuman Warga',
            share,
            moment
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error loading page');
    }
};

exports.resetData = async (req, res) => {
    try {
        if (req.session.user.role !== 'admin') {
            req.flash('error_msg', 'Unauthorized');
            return res.redirect('/dashboard');
        }

        const db = require('../config/db');

        // Reset Keuangan
        await db.query('TRUNCATE TABLE kas');

        // Reset Ronda Attendance & Fines
        await db.query(`
            UPDATE ronda_jadwal 
            SET status = 'scheduled', 
                denda = 0, 
                status_bayar = NULL, 
                bukti_bayar = NULL, 
                foto_bukti = NULL, 
                keterangan = NULL
        `);

        // Clear Documentation
        await db.query('TRUNCATE TABLE ronda_dokumentasi');

        req.flash('success_msg', 'Data keuangan, denda, dan absen ronda berhasil direset.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal mereset data.');
        res.redirect('/dashboard');
    }
};
