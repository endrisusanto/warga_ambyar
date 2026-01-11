const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for profiles
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/profiles';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports images"));
    }
}).single('foto_profil');

exports.index = async (req, res) => {
    try {
        let wargaData = null;
        let userData = req.session.user;

        if (req.session.user.warga_id) {
            const [rows] = await db.query("SELECT * FROM warga WHERE id = ?", [req.session.user.warga_id]);
            wargaData = rows[0];
        } else {
            // For admin without warga_id, get user data
            const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [req.session.user.id]);
            userData = rows[0];
        }

        res.render('profile/index', {
            user: req.session.user,
            userData: userData,
            warga: wargaData,
            title: 'Profile Saya',
            success: req.query.success,
            password_changed: req.query.password_changed
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error loading profile');
    }
};

exports.update = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.send('<script>alert("Error upload: ' + err.message + '"); window.history.back();</script>');
        }

        try {
            const { nama } = req.body;
            const updates = [];
            const values = [];

            if (nama) {
                updates.push("nama = ?");
                values.push(nama);
            }

            if (req.file) {
                updates.push("foto_profil = ?");
                values.push(req.file.filename);
            }

            if (updates.length > 0) {
                if (req.session.user.warga_id) {
                    // Update warga table
                    values.push(req.session.user.warga_id);
                    await db.query(`UPDATE warga SET ${updates.join(', ')} WHERE id = ?`, values);

                    // Also update users table foto_profil if changed (for consistency)
                    if (req.file) {
                        await db.query(`UPDATE users SET foto_profil = ? WHERE id = ?`, [req.file.filename, req.session.user.id]);
                    }
                } else {
                    // Update users table for admin
                    values.push(req.session.user.id);
                    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

                    // Update session with new name
                    if (nama) {
                        req.session.user.nama = nama;
                    }
                }
            }

            res.redirect('/profile?success=true');

        } catch (e) {
            console.error(e);
            res.status(500).send('Error updating profile');
        }
    });
};

exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;

        // Validation
        if (!current_password || !new_password || !confirm_password) {
            return res.send('<script>alert("Semua field harus diisi"); window.history.back();</script>');
        }

        if (new_password !== confirm_password) {
            return res.send('<script>alert("Password baru dan konfirmasi tidak cocok"); window.history.back();</script>');
        }

        if (new_password.length < 6) {
            return res.send('<script>alert("Password minimal 6 karakter"); window.history.back();</script>');
        }

        // Get current user password
        const [users] = await db.query("SELECT password FROM users WHERE id = ?", [req.session.user.id]);

        if (users.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = users[0];

        // Verify current password
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(current_password, user.password);

        if (!isMatch) {
            return res.send('<script>alert("Password lama tidak sesuai"); window.history.back();</script>');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Update password
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.session.user.id]);

        res.redirect('/profile?password_changed=true');

    } catch (e) {
        console.error(e);
        res.status(500).send('Error changing password');
    }
};
