const db = require('../config/db');

const Musyawarah = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM musyawarah ORDER BY tanggal DESC, created_at DESC');
        return rows;
    },
    create: async (data) => {
        const { judul, konten, lampiran, tanggal } = data;
        const [result] = await db.query(
            'INSERT INTO musyawarah (judul, konten, lampiran, tanggal) VALUES (?, ?, ?, ?)',
            [judul, konten, lampiran, tanggal]
        );
        return result.insertId;
    },
    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM musyawarah WHERE id = ?', [id]);
        return rows[0];
    },
    delete: async (id) => {
        await db.query('DELETE FROM musyawarah WHERE id = ?', [id]);
    }
};

module.exports = Musyawarah;
