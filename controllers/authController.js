const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.postLogin = async (req, res) => {
    const { username, password, remember_me } = req.body;
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

        // "Remember Me" logic
        if (remember_me === 'on') {
            // Set session to expire in 30 days
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
            // Browser-session cookie (expires when browser is closed)
            req.session.cookie.expires = false;
        }

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
            is_ronda: status_keluarga === 'Kepala Keluarga' ? 1 : 0
        });

        const userCount = await User.count();
        console.log('DEBUG: User count:', userCount, typeof userCount);
        const role = Number(userCount) === 0 ? 'admin' : 'warga';
        console.log('DEBUG: Assigning role:', role);

        // Set approval status
        await Warga.updateApprovalStatus(wargaId, role === 'admin' ? 'approved' : 'pending');

        const hashedPassword = await bcrypt.hash(password, 10);
        // Create User linked to Warga
        const userId = await User.create(username, hashedPassword, role, wargaId);

        // Auto Login
        const user = await User.findByUsername(username);
        req.session.user = user;
        req.session.save(() => {
            const msg = role === 'admin' ? 'Registrasi Admin Berhasil!' : 'Registrasi berhasil! Menunggu approval.';
            req.flash('success_msg', msg);
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
