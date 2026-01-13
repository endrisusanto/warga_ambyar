const db = require('../config/db');

module.exports = async function () {
    try {
        const [rows] = await db.query(`
            SELECT w.no_hp 
            FROM users u 
            JOIN warga w ON u.warga_id = w.id 
            WHERE u.username = 'endrisusanto' 
            LIMIT 1
        `);

        if (rows.length > 0) {
            return rows[0].no_hp;
        }

        // Fallback to any admin
        const [adminRows] = await db.query(`
            SELECT w.no_hp 
            FROM users u 
            JOIN warga w ON u.warga_id = w.id 
            WHERE u.role = 'admin' 
            LIMIT 1
        `);

        if (adminRows.length > 0) {
            return adminRows[0].no_hp;
        }

        return '6281234567890'; // Default fallback
    } catch (err) {
        console.error('Failed to fetch admin phone:', err);
        return '6281234567890';
    }
};
