const db = require('../config/db');

const User = {
    findByUsername: async (username) => {
        const [rows] = await db.query(`
            SELECT u.*, w.approval_status, w.nama, w.blok, w.nomor_rumah 
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
    }
};

module.exports = User;
