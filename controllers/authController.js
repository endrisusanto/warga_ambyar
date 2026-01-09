const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findByUsername(username);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Incorrect password');
            return res.redirect('/auth/login');
        }

        req.session.user = user;
        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Server error');
        res.redirect('/auth/login');
    }
};

exports.getRegister = (req, res) => {
    res.render('register', { title: 'Register' });
};

exports.postRegister = async (req, res) => {
    const { username, password, confirm_password, nama, blok, nomor_rumah, status_keluarga, no_hp } = req.body;

    if (password !== confirm_password) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/auth/register');
    }

    try {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            req.flash('error_msg', 'Username already exists');
            return res.redirect('/auth/register');
        }

        // Create Warga first
        const Warga = require('../models/Warga');
        const wargaId = await Warga.create({
            nama,
            blok,
            nomor_rumah,
            status_keluarga,
            no_hp,
            status_huni: 'Tetap', // Default
            is_ronda: 0 // Default
        });

        // Set approval status to pending
        await Warga.updateApprovalStatus(wargaId, 'pending');

        const hashedPassword = await bcrypt.hash(password, 10);
        // Create User linked to Warga
        const userId = await User.create(username, hashedPassword, 'warga', wargaId);

        // Auto Login
        const user = await User.findByUsername(username);
        req.session.user = user;
        req.session.save(() => {
            req.flash('success_msg', 'Registrasi berhasil! Menunggu approval dari admin/ketua.');
            res.redirect('/dashboard');
        });

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Server error: ' + err.message);
        res.redirect('/auth/register');
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
};
