const Ronda = require('../models/Ronda');
const Warga = require('../models/Warga');
const db = require('../config/db');
const moment = require('moment');
const multer = require('multer');
const path = require('path');

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
        const month = req.query.month || moment().format('MM');
        const year = req.query.year || moment().format('YYYY');

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
            user: req.session.user
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

exports.updateStatus = async (req, res) => {
    try {
        const { id, status, keterangan } = req.body;

        if (status === 'reschedule') {
            await Ronda.reschedule(id, keterangan);
            req.flash('success_msg', 'Jadwal berhasil di-reschedule ke minggu depan');
        } else {
            await Ronda.updateStatus(id, status, keterangan);
            req.flash('success_msg', 'Status ronda diperbarui');
        }

        res.redirect('/ronda');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update status');
        res.redirect('/ronda');
    }
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

        res.render('ronda/public_view', {
            title: 'Jadwal Ronda ' + mDate.format('DD MMM YYYY'),
            dateLabel: mDate.format('dddd, DD MMMM YYYY'),
            schedule: daySchedule,
            allPhotos,
            teamName,
            ogImage: img ? '/uploads/shares/' + img : null,
            moment
        });

    } catch (e) {
        console.error(e);
        res.status(500).send('Error loading page');
    }
};

exports.control = async (req, res) => {
    try {
        const month = req.query.month || moment().format('MM');
        const year = req.query.year || moment().format('YYYY');

        // Determine Saturdays
        const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        const endDate = startDate.clone().endOf('month');
        const saturdays = [];
        let day = startDate.clone();
        while (day <= endDate) {
            if (day.day() === 6) saturdays.push(day.format('YYYY-MM-DD'));
            day.add(1, 'days');
        }

        // Get All Warga Wajib Ronda (Only Heads of Family) - Sorted by Block and House Number
        const [warga] = await db.query("SELECT id, nama, blok, nomor_rumah, tim_ronda FROM warga WHERE is_ronda = 1 AND status_keluarga = 'Kepala Keluarga' ORDER BY blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC");

        // Get Schedules for this month
        const [schedules] = await db.query(`
            SELECT * FROM ronda_jadwal 
            WHERE tanggal BETWEEN ? AND ?
        `, [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);

        // Build Matrix
        const matrix = {};
        warga.forEach(w => {
            matrix[w.id] = {
                info: w,
                dates: {}
            };
            saturdays.forEach(d => {
                matrix[w.id].dates[d] = { status: null, denda: 0 };
            });
        });

        schedules.forEach(s => {
            const d = moment(s.tanggal).format('YYYY-MM-DD');
            if (matrix[s.warga_id] && matrix[s.warga_id].dates[d]) {
                matrix[s.warga_id].dates[d] = s;
            }
        });

        res.render('ronda/control', {
            title: 'Control Ronda / Absensi',
            month,
            year,
            saturdays,
            matrix,
            moment,
            user: req.user,
            useWideContainer: true
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
