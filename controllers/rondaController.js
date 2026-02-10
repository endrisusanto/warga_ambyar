const Ronda = require('../models/Ronda');
const Warga = require('../models/Warga');
const db = require('../config/db');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const Kas = require('../models/Kas');
const ExcelJS = require('exceljs');

// Multer Config for Ronda
const storage = multer.diskStorage({
    destination: './public/uploads/ronda/',
    filename: function (req, file, cb) {
        cb(null, 'ronda-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50000000 }, // 50MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).array('foto_bukti', 10); // Max 10 photos

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
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
        const now = moment();
        let queryMonth = req.query.month;
        let queryYear = req.query.year;

        // Special check: If today is 1st of month AND before 6 AM, show previous month by default
        if (!queryMonth && !queryYear) {
            if (now.date() === 1 && now.hour() < 6) {
                const prevMonth = now.clone().subtract(1, 'month');
                queryMonth = prevMonth.format('MM');
                queryYear = prevMonth.format('YYYY');
            } else {
                queryMonth = now.format('MM');
                queryYear = now.format('YYYY');
            }
        }

        const month = queryMonth || now.format('MM');
        const year = queryYear || now.format('YYYY');

        await Ronda.generateSchedule(month, year);

        const schedule = await Ronda.getMonthlySchedule(month, year);

        // Pre-parse photos to fix double encoding issues
        schedule.forEach(s => {
            s.parsedPhotos = [];
            if (s.foto_bukti) {
                if (Array.isArray(s.foto_bukti)) {
                    s.parsedPhotos = s.foto_bukti;
                } else {
                    let raw = String(s.foto_bukti);
                    try {
                        let parsed = JSON.parse(raw);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        if (Array.isArray(parsed)) s.parsedPhotos = parsed;
                    } catch (e) {
                        if (raw.includes(',')) s.parsedPhotos = raw.split(',').map(p => p.trim());
                        else s.parsedPhotos = [raw.trim()];
                    }
                }
                console.log('DEBUG SCHED ' + s.id, 'PARSED:', s.parsedPhotos);
            }
        });
        
        // Check for recent reschedules - only for current/past months
        const db = require('../config/db');
        const viewingMonth = moment(`${year}-${month}-01`);
        
        // Only check reschedules if viewing current month or past months
        if (viewingMonth.isSameOrBefore(now, 'month')) {
            const [recentReschedules] = await db.query(
                `SELECT DISTINCT warga_id 
                 FROM ronda_jadwal 
                 WHERE status = 'reschedule' 
                 AND tanggal >= ? 
                 AND tanggal < ?`,
                [
                    moment().subtract(4, 'weeks').format('YYYY-MM-DD'),
                    moment().format('YYYY-MM-DD')
                ]
            );
            
            const wargaWithReschedule = new Set(recentReschedules.map(r => r.warga_id));
            
            // Determine the upcoming Saturday (active ronda)
            const currentDay = now.day();
            const currentHour = now.hour();
            let upcomingSaturday = null;
            
            // If it's Sunday before 6 AM, the upcoming Saturday is next week
            if (currentDay === 0 && currentHour < 6) {
                upcomingSaturday = now.clone().add(6, 'days').format('YYYY-MM-DD');
            } else {
                // Find the Saturday of the current week
                const startOfWeek = now.clone().startOf('week');
                const thisSaturday = startOfWeek.clone().add(6, 'days');
                
                // If today is Saturday after 6 PM or Sunday after 6 AM, next Saturday is upcoming
                if ((currentDay === 6 && currentHour >= 18) || (currentDay === 0 && currentHour >= 6)) {
                    upcomingSaturday = thisSaturday.clone().add(7, 'days').format('YYYY-MM-DD');
                } else {
                    upcomingSaturday = thisSaturday.format('YYYY-MM-DD');
                }
            }
            
            // Mark scheduled entries ONLY for upcoming Saturday
            schedule.forEach(s => {
                const scheduleDate = moment(s.tanggal).format('YYYY-MM-DD');
                if (s.status === 'scheduled' && 
                    wargaWithReschedule.has(s.warga_id) &&
                    scheduleDate === upcomingSaturday) {
                    s.hasRecentReschedule = true;
                }
            });
        }
        
        const teams = await Ronda.getTeams();

        const groupedSchedule = {};
        schedule.forEach(s => {
            const date = moment(s.tanggal).format('YYYY-MM-DD');
            if (!groupedSchedule[date]) groupedSchedule[date] = [];
            groupedSchedule[date].push(s);
        });

        const documentation = await Ronda.getDokumentasi(month, year);

        documentation.forEach(d => {
            d.parsedPhotos = [];
            if (d.foto) {
                if (Array.isArray(d.foto)) {
                    d.parsedPhotos = d.foto;
                } else {
                    let raw = String(d.foto);
                    try {
                        let parsed = JSON.parse(raw);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        if (Array.isArray(parsed)) d.parsedPhotos = parsed;
                    } catch (e) {
                        if (raw.includes(',')) d.parsedPhotos = raw.split(',').map(p => p.trim());
                        else d.parsedPhotos = [raw.trim()];
                    }
                }
                console.log('DEBUG DOC', 'PARSED:', d.parsedPhotos);
            }
        });

        const groupedDocumentation = {};
        documentation.forEach(d => {
            const date = moment(d.tanggal).format('YYYY-MM-DD');
            if (!groupedDocumentation[date]) groupedDocumentation[date] = [];
            groupedDocumentation[date].push(d);
        });

        res.render('ronda/index', {
            title: 'Jadwal Ronda',
            groupedSchedule,
            groupedDocumentation,
            teams,
            month,
            year,
            moment,
            user: req.session.user,
            staticQris: process.env.QRIS_RONDA
        });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
};

exports.teams = async (req, res) => {
    try {
        const teams = await Ronda.getTeams();
        res.render('ronda/teams', {
            title: 'Tim Ronda',
            teams,
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.redirect('/ronda');
    }
};

exports.updateTeam = async (req, res) => {
    try {
        const { warga_id, tim } = req.body;
        await Ronda.updateMemberTeam(warga_id, tim);
        req.flash('success_msg', 'Tim berhasil diupdate');
        res.redirect('/ronda/teams');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update tim');
        res.redirect('/ronda/teams');
    }
};

exports.updateStatus = (req, res) => {
    const uploadSelfie = multer({ storage: storage }).single('bukti_hadir');

    uploadSelfie(req, res, async (err) => {
        if (err) {
            console.error('[ERROR] Multer:', err);
            req.flash('error_msg', 'Gagal upload foto: ' + err.message);
            return res.redirect(req.get('Referer') || '/ronda');
        }

        try {
            let { id, status } = req.body;
            const { warga_id, date } = req.body; 
            const keterangan = req.body.keterangan || '';
            const redirectUrl = req.body.redirectUrl;

            // Handle "virtual" schedules (not yet in DB)
            if (!id && warga_id && date) {
                try {
                    console.log(`[DEBUG] Creating schedule for WargaID: ${warga_id}, Date: ${date}`);
                    id = await Ronda.ensureSchedule(date, warga_id);
                } catch (createErr) {
                    console.error('[ERROR] Failed to ensure schedule:', createErr);
                    req.flash('error_msg', 'Gagal membuat jadwal baru: ' + createErr.message);
                    return res.redirect(req.get('Referer') || '/ronda');
                }
            }

            console.log(`[DEBUG] Updating status for ID: ${id} to ${status}`);

            if (!id || !status) {
                req.flash('error_msg', 'Data tidak lengkap (ID/Status missing)');
                return res.redirect(req.get('Referer') || '/ronda');
            }

            if (status === 'reschedule') {
                await Ronda.reschedule(id, keterangan);
                req.flash('success_msg', 'Jadwal berhasil di-reschedule ke minggu depan');
            } else {
                await Ronda.updateStatus(id, status, keterangan);
                
                // If 'hadir' and file exists, update photo proof
                if (status === 'hadir' && req.file) {
                    await Ronda.updatePhotos(id, [req.file.filename]);
                }
                
                req.flash('success_msg', 'Status ronda diperbarui');
            }

            if (redirectUrl) {
                return res.redirect(redirectUrl);
            }
            res.redirect(req.get('Referer') || '/ronda');

        } catch (err) {
            console.error('[ERROR] Controller Exception:', err);
            req.flash('error_msg', 'Gagal update status: ' + err.message);
            res.redirect(req.get('Referer') || '/ronda');
        }
    });
};

exports.payFine = async (req, res) => {
    try {
        const { id } = req.body;
        await Ronda.payFine(id);
        req.flash('success_msg', 'Denda lunas');
        res.redirect('/ronda');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal bayar denda');
        res.redirect('/ronda');
    }
};

exports.submitFine = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/ronda');
        }
        if (!req.files || req.files.length === 0) {
            req.flash('error_msg', 'Upload bukti pembayaran!');
            return res.redirect('/ronda');
        }

        try {
            console.log('DEBUG submitFine BODY:', req.body);
            console.log('DEBUG submitFine FILES:', req.files);
            const { id } = req.body;
            const filename = req.files[0].filename;

            // Temporary Auto-Migration to ensure columns exist
            try { await db.query("ALTER TABLE ronda_jadwal ADD COLUMN bukti_bayar VARCHAR(255) NULL"); } catch (e) { }
            try { await db.query("ALTER TABLE ronda_jadwal ADD COLUMN status_bayar ENUM('pending', 'paid', 'rejected') DEFAULT NULL"); } catch (e) { }

            await Ronda.submitFinePayment(id, filename);
            req.flash('success_msg', 'Bukti pembayaran dikirim, menunggu verifikasi admin.');
            
            if (req.body.redirectUrl) {
                return res.redirect(req.body.redirectUrl);
            }
            res.redirect(req.get('Referer') || '/ronda');
        } catch (error) {
            console.error('DEBUG submitFine ERROR:', error);
            req.flash('error_msg', 'Gagal mengirim bukti pembayaran: ' + error.message);
            res.redirect(req.get('Referer') || '/ronda');
        }
    });
};

exports.verifyFine = async (req, res) => {
    try {
        const { id, action } = req.body;
        if (action === 'approve') {
            // Get fine details before resetting it
            const [rows] = await db.query("SELECT r.denda, w.nama FROM ronda_jadwal r JOIN warga w ON r.warga_id = w.id WHERE r.id = ?", [id]);

            if (rows.length > 0) {
                const { denda, nama } = rows[0];

                await Ronda.payFine(id);

                // Add to Kas
                if (denda > 0) {
                    await Kas.add('masuk', denda, `Denda Ronda - ${nama}`, new Date());
                }

                req.flash('success_msg', 'Pembayaran denda disetujui dan dicatat di Kas.');
            }
        } else if (action === 'reject') {
            // Logic to reject (maybe reset status_bayar to null or 'rejected')
            // For now, let's just keep it simple or add a reject method in model
            // await Ronda.rejectFine(id); 
            req.flash('info_msg', 'Pembayaran ditolak (Not implemented yet)');
        }
        res.redirect('/ronda');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal verifikasi pembayaran');
        res.redirect('/ronda');
    }
};

exports.updateFineStatus = async (req, res) => {
    try {
        let { ids } = req.body;
        if (typeof ids === 'string') ids = ids.split(',');
        
        await Ronda.markAsPaid(ids);
        
        // Add to Kas (Optional, calculate total first)
        // For simplicity, we just mark as paid for now.
        // If we want to add to Kas, we need to fetch amounts.
        try {
            const [rows] = await db.query("SELECT denda, nama FROM ronda_jadwal r JOIN warga w ON r.warga_id = w.id WHERE r.id IN (?)", [ids]);
            let total = 0;
            rows.forEach(r => total += (r.denda || 0));
            if (total > 0) {
                 await Kas.add('masuk', total, `Bayar Denda Ronda (Admin) - ${rows.length} item`, new Date());
            }
        } catch(e) { console.error('Error adding to kas', e); }

        req.flash('success_msg', 'Status denda berhasil diupdate menjadi LUNAS');
        res.redirect('/ronda/control');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update status denda');
        res.redirect('/ronda/control');
    }
};

exports.uploadPhotos = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/ronda');
        } else {
            if (req.files == undefined || req.files.length == 0) {
                req.flash('error_msg', 'No file selected!');
                return res.redirect('/ronda');
            } else {
                try {
                    const photos = req.files.map(file => file.filename);
                    await Ronda.updatePhotos(req.params.id, photos);
                    req.flash('success_msg', 'Foto bukti berhasil diupload!');
                    res.redirect('/ronda');
                } catch (error) {
                    console.error(error);
                    req.flash('error_msg', 'Gagal menyimpan data foto');
                    res.redirect('/ronda');
                }
            }
        }
    });
};

exports.uploadCondition = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/ronda');
        } else {
            if (req.files == undefined || req.files.length == 0) {
                req.flash('error_msg', 'No file selected!');
                return res.redirect('/ronda');
            } else {
                try {
                    const photos = req.files.map(file => file.filename);
                    const date = req.params.date;
                    await Ronda.addDokumentasi(date, photos);

                    req.flash('success_msg', 'Foto kondisi berhasil diupload!');
                    res.redirect('/ronda');
                } catch (error) {
                    console.error(error);
                    req.flash('error_msg', 'Gagal menyimpan foto kondisi');
                    res.redirect('/ronda');
                }
            }
        }
    });
};

const fs = require('fs');

// Ensure shares directory exists
const shareDir = './public/uploads/shares/';
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

// Share Image Storage
const shareStorage = multer.diskStorage({
    destination: shareDir,
    filename: function (req, file, cb) {
        cb(null, 'share-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadShare = multer({ storage: shareStorage }).single('image');

exports.deletePhoto = async (req, res) => {
    try {
        const { filename } = req.body;
        await Ronda.deletePhoto(filename);

        // Delete physical file
        const filePath = path.join(__dirname, '../public/uploads/ronda/', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        req.flash('success_msg', 'Foto berhasil dihapus');
        res.redirect('/ronda');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menghapus foto');
        res.redirect('/ronda');
    }
};

exports.uploadShareImage = (req, res) => {
    uploadShare(req, res, async (err) => {
        if (err) return res.json({ success: false, error: err.message });
        if (!req.file) return res.json({ success: false, error: 'No file uploaded' });

        let date = moment().format('YYYY-MM-DD');
        const match = req.file.originalname.match(/schedule-(\d{4}-\d{2}-\d{2})/);
        if (match) {
            date = match[1];
        }

        try {
            const shareId = await Ronda.createShare(date, req.file.filename);
            res.json({ success: true, filename: req.file.filename, shareId });
        } catch (e) {
            console.error(e);
            res.json({ success: true, filename: req.file.filename });
        }
    });
};

exports.createShare = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.json({ success: false, error: 'Date is required' });
        }

        // Create share record without image - OG image will be generated on public view page
        const shareId = await Ronda.createShare(date, 'pending');
        res.json({ success: true, shareId });
    } catch (e) {
        console.error('Error creating share:', e);
        res.json({ success: false, error: e.message });
    }
};

exports.updateShareImage = (req, res) => {
    uploadShare(req, res, async (err) => {
        if (err) return res.json({ success: false, error: err.message });
        if (!req.file) return res.json({ success: false, error: 'No file uploaded' });

        const { shareId } = req.body;
        if (!shareId) return res.json({ success: false, error: 'Share ID is required' });

        try {
            await Ronda.updateShareImage(shareId, req.file.filename);
            res.json({ success: true, filename: req.file.filename });
        } catch (e) {
            console.error(e);
            res.json({ success: false, error: e.message });
        }
    });
};


exports.viewPublic = async (req, res) => {
    try {
        let { date, img } = req.query;
        const shareId = req.params.id || req.query.id;

        if (shareId) {
            const share = await Ronda.getShare(shareId);
            if (share) {
                date = moment(share.date).format('YYYY-MM-DD');
                img = share.image_filename;
            }
        }

        if (!date) return res.redirect('/');

        const mDate = moment(date);
        const month = mDate.format('MM');
        const year = mDate.format('YYYY');

        // Ensure schedule exists
        await Ronda.generateSchedule(month, year);
        const schedule = await Ronda.getMonthlySchedule(month, year);

        // Filter for specific date
        const daySchedule = schedule.filter(s => moment(s.tanggal).isSame(mDate, 'day'));

        // Parse photos
        daySchedule.forEach(s => {
            s.parsedPhotos = [];
            if (s.foto_bukti) {
                if (Array.isArray(s.foto_bukti)) {
                    s.parsedPhotos = s.foto_bukti;
                } else {
                    let raw = String(s.foto_bukti);
                    try {
                        let parsed = JSON.parse(raw);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        if (Array.isArray(parsed)) s.parsedPhotos = parsed;
                    } catch (e) {
                        if (raw.includes(',')) s.parsedPhotos = raw.split(',').map(p => p.trim());
                        else s.parsedPhotos = [raw.trim()];
                    }
                }
            }
        });

        // Get Documentation
        const documentation = await Ronda.getDokumentasi(month, year);
        const dayDocs = documentation.filter(d => moment(d.tanggal).isSame(mDate, 'day'));
        dayDocs.forEach(d => {
            d.parsedPhotos = [];
            if (d.foto) {
                try {
                    let parsed = JSON.parse(d.foto);
                    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                    if (Array.isArray(parsed)) d.parsedPhotos = parsed;
                } catch (e) {
                    d.parsedPhotos = [d.foto];
                }
            }
        });

        const allPhotos = [];
        // Combine photos logic
        daySchedule.forEach(s => {
            if (s.parsedPhotos) s.parsedPhotos.forEach(p => allPhotos.push({ src: p, type: 'individual', uploader: s.nama }));
        });
        dayDocs.forEach(d => {
            if (d.parsedPhotos) d.parsedPhotos.forEach(p => allPhotos.push({ src: p, type: 'condition', uploader: 'Kondisi' }));
        });

        // Determine Team Name logic
        const teamCounts = {};
        daySchedule.forEach(s => {
            if (s.tim_ronda) teamCounts[s.tim_ronda] = (teamCounts[s.tim_ronda] || 0) + 1;
        });
        let teamName = null;
        let maxCount = 0;
        Object.entries(teamCounts).forEach(([team, count]) => {
            if (count > maxCount) { maxCount = count; teamName = team; }
        });

        // Mark Ganti Hari
        daySchedule.forEach(s => {
            s.is_ganti_hari = (teamName && s.tim_ronda !== teamName);
        });

        res.render('ronda/public_view', {
            title: 'Jadwal Ronda ' + mDate.format('DD MMM YYYY'),
            dateLabel: mDate.format('dddd, DD MMMM YYYY'),
            schedule: daySchedule,
            allPhotos,
            teamName,
            ogImage: (img && img !== 'pending') ? '/uploads/shares/' + img : null,
            shareId: shareId,
            moment
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error loading page');
    }
};

exports.updatePublicStatus = (req, res) => {
    // Debug: Log entry
    console.log('[DEBUG] updatePublicStatus called');

    const uploadSelfie = multer({ storage: storage }).single('bukti_hadir');

    uploadSelfie(req, res, async (err) => {
        // Debug: Log after multer
        console.log('[DEBUG] Multer processed. Body:', req.body);
        console.log('[DEBUG] File:', req.file);

        if (err) {
            console.error('[ERROR] Multer:', err);
            req.flash('error_msg', 'Gagal upload foto: ' + err.message);
            return res.redirect(req.get('Referer') || '/');
        }

        try {
            const { id, status } = req.body;
            console.log(`[DEBUG] Updating status for ID: ${id} to ${status}`);

            if (!id || !status) {
                console.warn('[WARN] ID or Status missing');
                req.flash('error_msg', 'Data tidak lengkap');
                return res.redirect(req.get('Referer') || '/');
            }

            // Default keterangan for public updates
            const keterangan = req.body.keterangan || 'Update via Public View';

            const Ronda = require('../models/Ronda');
            
            // 1. Update Status
            if (status === 'reschedule') {
                await Ronda.reschedule(id, keterangan);
                console.log('[DEBUG] Reschedule success');
                req.flash('success_msg', 'Jadwal berhasil diganti ke minggu depan');
            } else {
                await Ronda.updateStatus(id, status, keterangan);
                console.log('[DEBUG] UpdateStatus success');
                
                // 2. If 'hadir' and file exists, update photo proof
                if (status === 'hadir' && req.file) {
                    // Start: Handle existing photos if any
                    // For now, simpler approach: overwrite/set array
                    await Ronda.updatePhotos(id, [req.file.filename]);
                    console.log('[DEBUG] Photo updated:', req.file.filename);
                }
                
                req.flash('success_msg', 'Status berhasil diupdate');
            }

            res.redirect(req.get('Referer') || '/');
        } catch (err) {
            console.error('[ERROR] Controller Exception:', err);
            req.flash('error_msg', 'Gagal update status: ' + err.message);
            res.redirect(req.get('Referer') || '/');
        }
    });
};

exports.control = async (req, res) => {
    try {
        await Ronda.autoProcessLateSchedules();

        const year = req.query.year || moment().format('YYYY');

        // Only generate schedule for years 2026 and onwards
        if (parseInt(year) >= 2026) {
            // Generate schedule for all months in the year
            for (let month = 1; month <= 12; month++) {
                const monthStr = String(month).padStart(2, '0');
                await Ronda.generateSchedule(monthStr, year);
            }
        }

        // Determine ALL Saturdays in the year
        const startDate = moment(`${year}-01-01`, 'YYYY-MM-DD');
        const endDate = moment(`${year}-12-31`, 'YYYY-MM-DD');
        const saturdays = [];
        let day = startDate.clone();
        while (day <= endDate) {
            if (day.day() === 6) saturdays.push(day.format('YYYY-MM-DD'));
            day.add(1, 'days');
        }

        // Get All HOUSES (unique blok + nomor_rumah) with their representatives
        // HOUSE-BASED SCHEDULING: One row per house, not per user
        const [houses] = await db.query(`
            SELECT 
                blok, 
                nomor_rumah,
                tim_ronda,
                (SELECT id FROM warga w2 
                 WHERE w2.blok = w1.blok 
                 AND w2.nomor_rumah = w1.nomor_rumah 
                 AND w2.is_ronda = 1
                 ORDER BY 
                    CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
                    w2.id
                 LIMIT 1
                ) as representative_id,
                (SELECT nama FROM warga w2 
                 WHERE w2.blok = w1.blok 
                 AND w2.nomor_rumah = w1.nomor_rumah 
                 AND w2.is_ronda = 1
                 ORDER BY 
                    CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
                    w2.id
                 LIMIT 1
                ) as representative_nama
            FROM warga w1
            WHERE is_ronda = 1 
            AND tim_ronda IS NOT NULL 
            AND tim_ronda != '-' 
            AND tim_ronda != ''
            GROUP BY blok, nomor_rumah, tim_ronda
            ORDER BY TRIM(tim_ronda) ASC, blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC
        `);

        // Get Schedules for this year
        const [schedules] = await db.query(`
            SELECT * FROM ronda_jadwal 
            WHERE tanggal BETWEEN ? AND ?
        `, [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);

        // Build Matrix based on HOUSES (blok + nomor_rumah)
        const matrix = {};
        houses.forEach(h => {
            if (!h.representative_id) return; // Skip houses without representatives
            
            // Use house identifier as key (blok-nomor_rumah)
            const houseKey = `${h.blok}-${h.nomor_rumah}`;
            matrix[houseKey] = {
                info: {
                    id: h.representative_id,
                    nama: h.representative_nama,
                    blok: h.blok,
                    nomor_rumah: h.nomor_rumah,
                    tim_ronda: h.tim_ronda
                },
                dates: {}
            };
            saturdays.forEach(d => {
                matrix[houseKey].dates[d] = { status: null, denda: 0 };
            });
        });

        // Map schedules to houses (not users)
        schedules.forEach(s => {
            const d = moment(s.tanggal).format('YYYY-MM-DD');
            const houseKey = `${s.blok}-${s.nomor_rumah}`;
            
            if (matrix[houseKey] && matrix[houseKey].dates[d]) {
                matrix[houseKey].dates[d] = s;
            }
        });

        res.render('ronda/control_v2', {
            title: 'Control Ronda / Absensi',
            year,
            saturdays,
            matrix,
            moment,
            user: req.user,
            useWideContainer: true,
            staticQris: process.env.QRIS_RONDA
        });

    } catch (e) {
        console.error(e);
        res.status(500).send('Error loading control page');
    }
};

exports.addManualParticipant = async (req, res) => {
    try {
        const { nama, blok, nomor_rumah } = req.body;
        if (!nama || !blok || !nomor_rumah) {
            return res.send("<script>alert('Data tidak lengkap'); window.history.back();</script>");
        }
        await Warga.create({
            nama,
            blok,
            nomor_rumah,
            status_keluarga: 'Kepala Keluarga',
            no_hp: '-',
            status_huni: 'tetap',
            is_ronda: true
        });
        res.redirect('/ronda/teams');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding participant");
    }
};

exports.exportControl = async (req, res) => {
    try {
        const year = req.query.year || moment().format('YYYY');
        
        // Range: Full Year
        const startDate = moment(`${year}-01-01`, 'YYYY-MM-DD');
        const endDate = moment(`${year}-12-31`, 'YYYY-MM-DD');

        const saturdays = [];
        let day = startDate.clone();
        
        // Find first Saturday of the year
        while(day.day() !== 6) {
            day.add(1, 'days');
        }
        
        while (day <= endDate) {
            saturdays.push(day.format('YYYY-MM-DD'));
            day.add(7, 'days'); // Optimization: add 7 days instead of 1
        }

        // Get All HOUSES (unique blok + nomor_rumah) with their representatives
        // HOUSE-BASED SCHEDULING: One row per house, not per user
        const [houses] = await db.query(`
            SELECT 
                blok, 
                nomor_rumah,
                tim_ronda,
                (SELECT id FROM warga w2 
                 WHERE w2.blok = w1.blok 
                 AND w2.nomor_rumah = w1.nomor_rumah 
                 AND w2.is_ronda = 1
                 ORDER BY 
                    CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
                    w2.id
                 LIMIT 1
                ) as representative_id,
                (SELECT nama FROM warga w2 
                 WHERE w2.blok = w1.blok 
                 AND w2.nomor_rumah = w1.nomor_rumah 
                 AND w2.is_ronda = 1
                 ORDER BY 
                    CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
                    w2.id
                 LIMIT 1
                ) as representative_nama
            FROM warga w1
            WHERE is_ronda = 1 
            AND tim_ronda IS NOT NULL 
            AND tim_ronda != '-' 
            AND tim_ronda != ''
            GROUP BY blok, nomor_rumah, tim_ronda
            ORDER BY TRIM(tim_ronda) ASC, blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC
        `);

        // Get Schedules for this wide range
        const [schedules] = await db.query(`
            SELECT * FROM ronda_jadwal 
            WHERE tanggal BETWEEN ? AND ?
        `, [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);

        // Build Matrix based on HOUSES
        const matrix = {};
        houses.forEach(h => {
            if (!h.representative_id) return;
            
            const houseKey = `${h.blok}-${h.nomor_rumah}`;
            matrix[houseKey] = {
                info: {
                    id: h.representative_id,
                    nama: h.representative_nama,
                    blok: h.blok,
                    nomor_rumah: h.nomor_rumah,
                    tim_ronda: h.tim_ronda
                },
                dates: {}
            };
            saturdays.forEach(d => {
                matrix[houseKey].dates[d] = { status: null, denda: 0 };
            });
        });

        schedules.forEach(s => {
            const d = moment(s.tanggal).format('YYYY-MM-DD');
            const houseKey = `${s.blok}-${s.nomor_rumah}`;
            if (matrix[houseKey] && matrix[houseKey].dates[d]) {
                matrix[houseKey].dates[d] = s;
            }
        });

        // Create Excel
        // Create Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Control Ronda');

        // Define Columns
        const columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama', key: 'nama', width: 30 },
            { header: 'Blok/Rumah', key: 'blok', width: 15 },
            { header: 'Tim', key: 'tim', width: 10 },
            { header: 'Total Denda', key: 'total', width: 15 },
            { header: 'Sudah Bayar', key: 'paid', width: 15 },
            { header: 'Terhutang', key: 'unpaid', width: 15 },
            { header: 'Tidak Hadir', key: 'absent', width: 15 }
        ];

        saturdays.forEach(s => {
            columns.push({ header: moment(s).format('DD MMM'), key: s, width: 12 });
        });
        
        worksheet.columns = columns;

        // Freeze Panes (First 8 columns + Header Row)
        worksheet.views = [
            { state: 'frozen', xSplit: 8, ySplit: 1 }
        ];

        // Style Header Row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Rows
        let rowNum = 1;
        Object.keys(matrix).forEach(houseKey => {
            const row = matrix[houseKey];
            // First calculate totals so we can put them in the left columns
            let totalDenda = 0;
            let totalPaid = 0;
            let totalUnpaid = 0;
            let totalAbsent = 0;
            const dateStatuses = {};

            saturdays.forEach(d => {
                const cell = row.dates[d];
                let statusText = '-';
                if (cell.status) {
                    statusText = cell.status.toUpperCase();
                    if (cell.status === 'alpa' && cell.denda > 0) statusText = 'DENDA';
                    if (cell.status === 'alpa') totalAbsent++;
                }
                
                if (cell.denda > 0) {
                    totalDenda += cell.denda;
                    if (cell.status_bayar === 'paid') {
                        totalPaid += cell.denda;
                    } else {
                        totalUnpaid += cell.denda;
                    }
                }
                dateStatuses[d] = statusText;
            });

            const rowData = [
                rowNum++,
                row.info.nama,
                `${row.info.blok}-${row.info.nomor_rumah}`,
                row.info.tim_ronda || '-',
                totalDenda > 0 ? `Rp ${totalDenda.toLocaleString('id-ID')}` : '-',
                totalPaid > 0 ? `Rp ${totalPaid.toLocaleString('id-ID')}` : '-',
                totalUnpaid > 0 ? `Rp ${totalUnpaid.toLocaleString('id-ID')}` : '-',
                totalAbsent > 0 ? `${totalAbsent}x` : '-'
            ];

            // Add date columns
            saturdays.forEach(d => {
                rowData.push(dateStatuses[d]);
            });

            const r = worksheet.addRow(rowData);
            
            // Styling
            r.eachCell((cell, colNumber) => {
                // Borders
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Conditional Coloring based on Value/Column
                
                // Determine upcoming Saturday index
                // Logic Copied from index controller
                const now = moment();
                const currentDay = now.day();
                const currentHour = now.hour();
                let upcomingSatDate = null;
                
                // Find Sat of current week
                const startOfWeek = now.clone().startOf('week'); // Sunday
                const thisSaturday = startOfWeek.clone().add(6, 'days');

                if ((currentDay === 6 && currentHour >= 18) || (currentDay === 0 && currentHour >= 6)) {
                    upcomingSatDate = thisSaturday.clone().add(7, 'days').format('YYYY-MM-DD');
                } else if (currentDay === 0 && currentHour < 6) {
                    // Masih hitungan sabtu kemarin (jika dini hari minggu)
                     // Tapi logic startOf('week') minggu adalah hari ke-0.
                     // Jadi thisSaturday adalah Sabtu di minggu ini.
                     // Jika skrg Minggu dini hari, berarti Sabtu kemarin adalah 'upcoming' (active)
                     upcomingSatDate = thisSaturday.clone().subtract(7, 'days').format('YYYY-MM-DD'); // wait, logic check
                     // Let's stick to simple logic: next Saturday from now
                     // If now is Sat before 18, it is today.
                } 
                
                // Simplified Logic to match UI:
                // Find closest Saturday that is today or future?
                // Or just use the exact logic from index:
                 if (currentDay === 0 && currentHour < 6) {
                    upcomingSatDate = now.clone().add(6, 'days').format('YYYY-MM-DD'); // Next sat
                 } else {
                    if (currentDay === 6 && currentHour >= 18) {
                         upcomingSatDate = now.clone().add(7, 'days').format('YYYY-MM-DD');
                    } else {
                        // Find this week's Saturday
                        upcomingSatDate = now.clone().day(6).format('YYYY-MM-DD');
                    }
                 }
                 
                 // Fix: moment().day(6) sets to THIS week's Sat. 
                 // If today is Sunday (0), day(6) is next Sat. Correct.
                 // If today is Mon (1), day(6) is this Sat. Correct.

                // Find column index for upcoming Saturday
                const upcomingIndex = saturdays.indexOf(upcomingSatDate);
                const upcomingColNum = upcomingIndex !== -1 ? (9 + upcomingIndex) : -1;

                if (colNumber === upcomingColNum) {
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } }; // Light Yellow
                     cell.font = { bold: true };
                }

                // Summary Columns (Indices 5, 6, 7 -> colNumber 5, 6, 7)
                if (colNumber === 5) { // Total Denda
                   // Optional: color if you want
                }
                if (colNumber === 6) { // Sudah Bayar
                    if (totalPaid > 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                        cell.font = { color: { argb: 'FF166534' }, bold: true };
                    }
                }
                if (colNumber === 7) { // Terhutang
                    if (totalUnpaid > 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                        cell.font = { color: { argb: 'FF991B1B' }, bold: true };
                    }
                }

                // Status Columns (Indices > 7)
                if (colNumber > 7) {
                    const val = cell.value;
                    if (val === 'HADIR') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; 
                        cell.font = { color: { argb: 'FF166534' } }; 
                    } else if (val === 'IZIN') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; 
                        cell.font = { color: { argb: 'FF854D0E' } }; 
                    } else if (val === 'DENDA' || val === 'ALPA') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; 
                        cell.font = { color: { argb: 'FF991B1B' } }; 
                    } else if (val === 'RESCHEDULE') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; 
                        cell.font = { color: { argb: 'FF1E40AF' } }; 
                    }
                }
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Control_Ronda_${year}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        res.status(500).send('Error exporting excel');
    }
};
