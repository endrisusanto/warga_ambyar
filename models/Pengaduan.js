const db = require('../config/db');

const Pengaduan = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT p.*, w.nama as nama_warga, w.blok, w.nomor_rumah 
            FROM pengaduan p
            LEFT JOIN warga w ON p.warga_id = w.id
            ORDER BY p.created_at DESC
        `);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query(`
            SELECT p.*, w.nama as nama_warga, w.blok, w.nomor_rumah
            FROM pengaduan p
            LEFT JOIN warga w ON p.warga_id = w.id
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    },

    getByWargaId: async (wargaId) => {
        const [rows] = await db.query(`
            SELECT * FROM pengaduan 
            WHERE warga_id = ? 
            ORDER BY created_at DESC
        `, [wargaId]);
        return rows;
    },

    create: async (data) => {
        const { warga_id, judul, deskripsi, foto, is_anonim } = data;
        const [result] = await db.query(
            'INSERT INTO pengaduan (warga_id, judul, deskripsi, foto, is_anonim) VALUES (?, ?, ?, ?, ?)',
            [warga_id, judul, deskripsi, foto, is_anonim ? 1 : 0]
        );
        return result.insertId;
    },

    updateStatus: async (id, status, tanggapan, userId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query(
                'UPDATE pengaduan SET status = ?, tanggapan = ? WHERE id = ?',
                [status, tanggapan, id]
            );

            // Add log
            await connection.query(
                'INSERT INTO pengaduan_comments (pengaduan_id, user_id, konten, type) VALUES (?, ?, ?, ?)',
                [id, userId, `Status diubah menjadi ${status.toUpperCase()}. ${tanggapan ? `\nCatatan: ${tanggapan}` : ''}`, 'log']
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    addComment: async (data) => {
        const { pengaduan_id, user_id, parent_id, konten, type, lampiran } = data;
        await db.query(
            'INSERT INTO pengaduan_comments (pengaduan_id, user_id, parent_id, konten, type, lampiran) VALUES (?, ?, ?, ?, ?, ?)',
            [pengaduan_id, user_id, parent_id || null, konten, type || 'comment', lampiran || null]
        );
    },

    getTimeline: async (pengaduanId) => {
        try {
            const [rows] = await db.query(`
                SELECT c.*, u.username, u.role, w.nama as warga_nama,
                       p_curr.konten as parent_konten,
                       u_parent.username as parent_username, 
                       w_parent.nama as parent_warga_nama
                FROM pengaduan_comments c
                LEFT JOIN users u ON c.user_id = u.id
                LEFT JOIN warga w ON u.warga_id = w.id
                LEFT JOIN pengaduan_comments p_curr ON c.parent_id = p_curr.id
                LEFT JOIN users u_parent ON p_curr.user_id = u_parent.id
                LEFT JOIN warga w_parent ON u_parent.warga_id = w_parent.id
                WHERE c.pengaduan_id = ?
                ORDER BY c.created_at ASC
            `, [pengaduanId]);
            return rows;
        } catch (error) {
            // Table might not exist yet
            console.error('getTimeline error:', error.message);
            return [];
        }
    },

    getStats: async () => {
        const [rows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'proses' THEN 1 ELSE 0 END) as proses,
                SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai
            FROM pengaduan
         `);
        const row = rows[0];
        return {
            total: row.total || 0,
            pending: row.pending || 0,
            proses: row.proses || 0,
            selesai: row.selesai || 0
        };
    },

    delete: async (id) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Delete associated comments first
            await connection.query('DELETE FROM pengaduan_comments WHERE pengaduan_id = ?', [id]);
            // Delete the complaint
            await connection.query('DELETE FROM pengaduan WHERE id = ?', [id]);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = Pengaduan;
