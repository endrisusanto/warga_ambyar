const db = require('../config/db');
const moment = require('moment');

module.exports = async (req, res, next) => {
    // Only track if user is logged in
    if (req.session && req.session.user && req.session.user.id) {
        try {
            const userId = req.session.user.id;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            const now = moment().format('YYYY-MM-DD HH:mm:ss');

            // Update user activity in background (don't await to not slow down request)
            db.query(
                'UPDATE users SET last_active = ?, last_ip = ?, last_user_agent = ? WHERE id = ?',
                [now, ip, userAgent, userId]
            ).catch(err => console.error('Error tracking user activity:', err));
            
        } catch (e) {
            console.error('Activity tracking middleware error:', e);
        }
    }
    next();
};
