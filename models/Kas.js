const db = require('../config/db');

const Kas = {
    add: async (tipe, jumlah, keterangan, tanggal, bukti_foto = null) => {
        const [result] = await db.query(
            'INSERT INTO kas (tipe, jumlah, keterangan, tanggal, bukti_foto) VALUES (?, ?, ?, ?, ?)',
            [tipe, jumlah, keterangan, tanggal, bukti_foto]
        );
        return result.insertId;
    },
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM kas ORDER BY tanggal DESC, id DESC');
        return rows;
    },
    getBalance: async () => {
        const [rows] = await db.query(`
            SELECT 
                SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END) - 
                SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END) as saldo
            FROM kas
        `);
        return rows[0].saldo || 0;
    },
    getSummary: async () => {
        const [rows] = await db.query(`
            SELECT 
                SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END) as pemasukan,
                SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END) as pengeluaran
            FROM kas
        `);
        return rows[0];
    },
    getMonthlyTrend: async () => {
        const [rows] = await db.query(`
            SELECT DATE_FORMAT(tanggal, '%Y-%m') as bulan,
                   SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END) as pemasukan,
                   SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END) as pengeluaran
            FROM kas
            GROUP BY bulan
            ORDER BY bulan DESC
            LIMIT 12
        `);
        return rows;
    },
    getByProof: async (filename) => {
        const [rows] = await db.query('SELECT * FROM kas WHERE bukti_foto = ?', [filename]);
        return rows;
    },
    delete: async (id) => {
        await db.query('DELETE FROM kas WHERE id = ?', [id]);
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM kas WHERE id = ?', [id]);
        return rows[0];
    }
};

module.exports = Kas;
