module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.session.user) {
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
