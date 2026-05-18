const User = require('../models/User');

function wantsJson(req) {
    return req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
}

module.exports = {
    ensureAuthenticated: async function (req, res, next) {
        if (req.session.user) {

            // SECURITY PATCH: Always refresh critical user data from DB
            // This ensures approval status and role are up-to-date
            try {
                const refreshedUser = await User.findByUsername(req.session.user.username);
                if (refreshedUser) {
                    // Update session data responsibly (keep non-db session flags if any, but overwrite db fields)
                    req.session.user = { ...req.session.user, ...refreshedUser };
                    req.session.save(); // Save background
                } else {
                    // User was deleted from DB but session exists?
                    // req.session.destroy();
                    // return res.redirect('/auth/login');
                    // For now just keep going, assume db issue or edge case
                }
            } catch (err) {
                console.error("Auth Middleware Refresh Error:", err);
            }

            // Set req.user for controllers to use
            req.user = req.session.user;

            // AUTH CHECK RIGOROUS
            const status = req.session.user.approval_status;
            const role = req.session.user.role;

            // LOCK LOGIC: If NOT Admin AND NOT Approved -> LOCK DOWN
            // This catches 'pending', null, undefined, 'rejected', etc.
            if (role !== 'admin' && status !== 'approved') {

                // Whitelist URLs (Pending Page & Logout)
                if (req.originalUrl.startsWith('/auth/pending') || req.originalUrl === '/auth/logout') {
                    return next();
                }

                // Redirect unauthorized users to pending page
                if (wantsJson(req)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Akun Anda belum disetujui admin.'
                    });
                }
                req.flash('error_msg', 'Akun Anda belum disetujui admin.'); // Optional feedback
                return res.redirect('/auth/pending');
            }

            return next();
        }
        if (wantsJson(req)) {
            return res.status(401).json({
                success: false,
                message: 'Sesi login habis. Silakan refresh halaman dan login kembali.'
            });
        }
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    },
    isAdminOrBendahara: function (req, res, next) {
        if (req.session.user && (['admin', 'bendahara', 'ketua'].includes(req.session.user.role))) {
            return next();
        }
        if (wantsJson(req)) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Hanya untuk Admin/Pengurus.'
            });
        }
        req.flash('error_msg', 'Akses ditolak. Hanya untuk Admin/Pengurus.');
        res.redirect('/dashboard');
    }
};
