// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Silakan login terlebih dahulu');
    res.redirect('/auth/login');
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
    res.redirect('/dashboard');
};

// Middleware to check if user is admin or ketua
exports.isAdminOrKetua = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'ketua')) {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya admin atau ketua yang dapat mengakses halaman ini.');
    res.redirect('/dashboard');
};

// Middleware to check if user is admin or bendahara
exports.isAdminOrBendahara = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'bendahara')) {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya admin atau bendahara yang dapat mengakses halaman ini.');
    res.redirect('/dashboard');
};

// Middleware to check if user can edit (not just 'warga')
exports.canEdit = (req, res, next) => {
    if (req.session.user && req.session.user.role !== 'warga') {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.');
    res.redirect('/dashboard');
};

// Middleware to check if user is approved
exports.isApproved = (req, res, next) => {
    // Admin always approved
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }

    // Check approval status
    if (req.session.user && req.session.user.approval_status === 'approved') {
        return next();
    }

    // If pending or rejected
    if (req.session.user && req.session.user.approval_status === 'pending') {
        req.flash('error_msg', 'Akun Anda masih menunggu persetujuan admin/ketua.');
        return res.redirect('/dashboard'); // Or a specific waiting page
    }

    if (req.session.user && req.session.user.approval_status === 'rejected') {
        req.flash('error_msg', 'Akun Anda ditolak. Silakan hubungi admin.');
        return res.redirect('/auth/logout');
    }

    // Fallback for old users without warga_id (assume approved or handle migration)
    // For now, let them pass if no approval_status (legacy admin/users)
    if (req.session.user && !req.session.user.approval_status) {
        return next();
    }

    res.redirect('/auth/login');
};
