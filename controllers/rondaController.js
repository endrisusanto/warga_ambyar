const Ronda = require('../models/Ronda');
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
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).array('foto_bukti', 10); // Max 10 photos

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
        const month = req.query.month || moment().format('MM');
        const year = req.query.year || moment().format('YYYY');

        await Ronda.generateSchedule(month, year);

        const schedule = await Ronda.getMonthlySchedule(month, year);
        const teams = await Ronda.getTeams();

        const groupedSchedule = {};
        schedule.forEach(s => {
            const date = moment(s.tanggal).format('YYYY-MM-DD');
            if (!groupedSchedule[date]) groupedSchedule[date] = [];
            groupedSchedule[date].push(s);
        });

        const documentation = await Ronda.getDokumentasi(month, year);
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
