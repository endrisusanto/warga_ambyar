const db = require('../config/db');

const User = {
    findByUsername: async (username) => {
        const [rows] = await db.query(`
            SELECT u.*, w.approval_status, w.nama, w.blok, w.nomor_rumah, w.foto_profil, u.profile_photo_url 
            FROM users u 
            LEFT JOIN warga w ON u.warga_id = w.id 
            WHERE u.username = ?
        `, [username]);
        return rows[0];
    },
    create: async (username, password, role = 'warga', warga_id = null) => {
        const [result] = await db.query(
            'INSERT INTO users (username, password, role, warga_id) VALUES (?, ?, ?, ?)',
            [username, password, role, warga_id]
        );
        return result.insertId;
    },
    updatePassword: async (id, password) => {
        await db.query('UPDATE users SET password = ? WHERE id = ?', [password, id]);
    },
    count: async () => {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
        return Number(rows[0].count);
    }
};

module.exports = User;
