const db = require('../config/db');
const moment = require('moment');

exports.index = async (req, res) => {
    try {
        const now = moment();
        const fiveMinutesAgo = now.clone().subtract(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');

        // Fetch all users with activity info
        const [users] = await db.query(`
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.last_active, 
                u.last_ip, 
                u.last_user_agent,
                w.nama as nama_warga,
                w.blok,
                w.nomor_rumah,
                w.foto_profil
            FROM users u
            LEFT JOIN warga w ON u.warga_id = w.id
            ORDER BY u.last_active DESC
            LIMIT 50
        `);

        // Categorize users
        const onlineUsers = users.filter(u => u.last_active && moment(u.last_active).isAfter(moment().subtract(5, 'minutes')));
        const offlineUsers = users.filter(u => u.last_active && moment(u.last_active).isBefore(moment().subtract(5, 'minutes')));

        // Fetch recent activity logs from DB with filters
        let activityLogs = [];
        try {
            // Get filter params
            const dateFilter = req.query.date || moment().format('YYYY-MM-DD');
            const actionFilter = req.query.action || '';
            
            // Build query with filters
            let query = 'SELECT * FROM activity_logs WHERE DATE(created_at) = ?';
            const params = [dateFilter];
            
            if (actionFilter) {
                query += ' AND action = ?';
                params.push(actionFilter);
            }
            
            query += ' ORDER BY created_at DESC LIMIT 500';
            
            const [logs] = await db.query(query, params);
            activityLogs = logs;
            console.log('Fetched Activity Logs:', activityLogs.length, 'for date:', dateFilter); // Debug log
        } catch (e) {
            console.error('Error fetching activity logs:', e.message);
            // Table might not exist yet, ignore error
        }

        res.render('monitoring/index', {
            title: 'User Monitoring',
            allUsers: users,
            onlineUsers,
            offlineUsers,
            activityLogs,
            moment,
            user: req.user,
            req: req
        });

    } catch (err) {
        console.error('Monitoring controller error:', err);
        res.status(500).send('Error loading monitoring page');
    }
};
