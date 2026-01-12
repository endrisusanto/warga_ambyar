const db = require('../config/db');

const Musyawarah = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM musyawarah ORDER BY tanggal DESC, created_at DESC');
        return rows;
    },
    create: async (data) => {
        const { judul, konten, lampiran, tanggal, created_by } = data;
        const [result] = await db.query(
            'INSERT INTO musyawarah (judul, konten, lampiran, tanggal, created_by) VALUES (?, ?, ?, ?, ?)',
            [judul, konten, lampiran, tanggal, created_by]
        );
        return result.insertId;
    },
    findById: async (id) => {
        const [rows] = await db.query(`
            SELECT m.*, 
                   u1.username as creator_name, 
                   u2.username as editor_name
            FROM musyawarah m
            LEFT JOIN users u1 ON m.created_by = u1.id
            LEFT JOIN users u2 ON m.updated_by = u2.id
            WHERE m.id = ?
        `, [id]);
        return rows[0];
    },
    delete: async (id) => {
        await db.query('DELETE FROM musyawarah WHERE id = ?', [id]);
    },
    update: async (id, data) => {
        const { judul, konten, lampiran, tanggal, updated_by } = data;
        await db.query(
            'UPDATE musyawarah SET judul = ?, konten = ?, lampiran = ?, tanggal = ?, updated_by = ? WHERE id = ?',
            [judul, konten, lampiran, tanggal, updated_by, id]
        );
        // Log edit history
        if (updated_by) {
            await db.query(
                'INSERT INTO musyawarah_edit_history (musyawarah_id, edited_by) VALUES (?, ?)',
                [id, updated_by]
            );
        }
    },
    getComments: async (musyawarahId) => {
        const [rows] = await db.query(`
            SELECT mc.*, u.username, w.nama as warga_nama,
                   pu.username as parent_username, pw.nama as parent_warga_nama,
                   pc.konten as parent_konten
            FROM musyawarah_comments mc
            JOIN users u ON mc.user_id = u.id
            LEFT JOIN warga w ON u.warga_id = w.id
            LEFT JOIN musyawarah_comments pc ON mc.parent_id = pc.id
            LEFT JOIN users pu ON pc.user_id = pu.id
            LEFT JOIN warga pw ON pu.warga_id = pw.id
            WHERE mc.musyawarah_id = ?
            ORDER BY mc.created_at ASC
        `, [musyawarahId]);
        return rows;
    },
    addComment: async (data) => {
        const { musyawarah_id, user_id, konten, parent_id } = data;
        const [result] = await db.query(
            'INSERT INTO musyawarah_comments (musyawarah_id, user_id, parent_id, konten) VALUES (?, ?, ?, ?)',
            [musyawarah_id, user_id, parent_id || null, konten]
        );
        return result.insertId;
    },
    getEditHistory: async (musyawarahId) => {
        const [rows] = await db.query(`
            SELECT meh.*, u.username, w.nama as warga_nama
            FROM musyawarah_edit_history meh
            JOIN users u ON meh.edited_by = u.id
            LEFT JOIN warga w ON u.warga_id = w.id
            WHERE meh.musyawarah_id = ?
            ORDER BY meh.edited_at DESC
        `, [musyawarahId]);
        return rows;
    }
};

module.exports = Musyawarah;
