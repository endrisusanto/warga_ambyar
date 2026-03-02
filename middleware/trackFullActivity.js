const db = require('../config/db');

module.exports = (req, res, next) => {
    // Skip static files
    if (req.originalUrl.startsWith('/js/') || 
        req.originalUrl.startsWith('/css/') || 
        req.originalUrl.startsWith('/fonts/') ||
        req.originalUrl.startsWith('/images/') ||
        req.originalUrl.startsWith('/uploads/')) {
        return next();
    }
    
    // Skip monitoring page to avoid spam (it auto-refreshes every 30s)
    if (req.originalUrl === '/monitoring') {
        return next();
    }
    
    // Log activity immediately (don't wait for response)
    setImmediate(async () => {
        try {
            const userId = req.session && req.session.user ? req.session.user.id : null;
            const username = req.session && req.session.user ? (req.session.user.nama || req.session.user.username) : 'Guest';
            
            let action = 'VIEW';
            let details = `${req.method} ${req.originalUrl}`;

            // Detect action type
            if (req.method === 'POST') {
                action = 'SUBMIT';
                if (req.originalUrl.includes('/login')) action = 'LOGIN';
                if (req.originalUrl.includes('/logout')) action = 'LOGOUT';
                if (req.originalUrl.includes('/upload') || req.file || req.files) action = 'UPLOAD';
            } else if (req.method === 'DELETE') {
                action = 'DELETE';
            } else if (req.method === 'PUT' || req.method === 'PATCH') {
                action = 'UPDATE';
            }

            // Check for file uploads
            if (req.file) {
                details += ` | File: ${req.file.originalname}`;
                action = 'UPLOAD';
            } else if (req.files) {
                const fileNames = Array.isArray(req.files) 
                    ? req.files.map(f => f.originalname).join(', ') 
                    : Object.values(req.files).flat().map(f => f.originalname).join(', ');
                details += ` | Files: ${fileNames}`;
                action = 'UPLOAD';
            }

            // Make details more readable
            if (req.originalUrl.includes('/iuran')) details = `Iuran - ${details}`;
            if (req.originalUrl.includes('/ronda')) details = `Ronda - ${details}`;
            if (req.originalUrl.includes('/profile')) details = `Profile - ${details}`;
            if (req.originalUrl.includes('/dashboard')) details = `Dashboard - ${details}`;
            if (req.originalUrl.includes('/keuangan')) details = `Keuangan - ${details}`;

            const ip = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.get('User-Agent') || 'unknown';

            // Insert into DB
            await db.query(
                `INSERT INTO activity_logs (user_id, username, action, details, ip_address, user_agent) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, username, action, details, ip, userAgent]
            );

        } catch (err) {
            // Silent fail - don't break the request
            console.error('Activity logging error:', err.message);
        }
    });

    next();
};
