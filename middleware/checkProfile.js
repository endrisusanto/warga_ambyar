module.exports = (req, res, next) => {
    // Skip for auth routes and static files
    if (req.path.startsWith('/auth') || req.path.startsWith('/public') || req.path.startsWith('/uploads')) {
        return next();
    }

    if (req.session.user && !req.session.user.warga_id) {
        // If user is logged in but has no linked warga_id, force profile completion
        return res.redirect('/auth/complete-profile');
    }

    next();
};
