module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.session.user) {
            // Check approval status for Read-Only mode
            if (req.session.user.approval_status === 'pending') {
                // Allow GET requests (Read-Only)
                if (req.method === 'GET') {
                    return next();
                }

                // Allow Logout (POST)
                if (req.originalUrl === '/auth/logout') {
                    return next();
                }

                // Block other state-changing requests
                req.flash('error_msg', 'Akun Anda masih dalam proses verifikasi (Read-Only). Anda tidak dapat melakukan perubahan data.');
                return res.redirect('back');
            }
            return next();
        }
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    },
    isAdminOrBendahara: function (req, res, next) {
        if (req.session.user && (['admin', 'bendahara', 'ketua'].includes(req.session.user.role))) {
            return next();
        }
        req.flash('error_msg', 'Akses ditolak. Hanya untuk Admin/Pengurus.');
        res.redirect('/dashboard');
    }
};
