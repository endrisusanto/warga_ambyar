const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.index = (req, res) => {
    res.render('profile/index', {
        title: 'Profil Saya',
        user: req.session.user
    });
};

exports.update = async (req, res) => {
    try {
        const { password, confirm_password } = req.body;
        const userId = req.session.user.id;

        if (password && password !== confirm_password) {
            req.flash('error_msg', 'Password tidak cocok');
            return res.redirect('/profile');
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.updatePassword(userId, hashedPassword);
        }

        req.flash('success_msg', 'Profil berhasil diperbarui');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal update profil');
        res.redirect('/profile');
    }
};
