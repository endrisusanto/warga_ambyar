const db = require('../config/db');

const Iuran = {
    create: async (warga_id, periode, jenis, jumlah) => {
        try {
            const [result] = await db.query(
                'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                [warga_id, periode, jenis, jumlah]
            );
            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return null;
            throw error;
        }
    },
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.blok, w.nomor_rumah 
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            ORDER BY i.periode DESC, w.blok, w.nomor_rumah
        `);
        return rows;
    },
    getByWargaId: async (warga_id) => {
        const [rows] = await db.query('SELECT * FROM iuran WHERE warga_id = ? ORDER BY periode DESC', [warga_id]);
        return rows;
    },
    updateStatus: async (id, status, bukti_bayar = null) => {
        let query = 'UPDATE iuran SET status = ?';
        const params = [status];

        if (bukti_bayar) {
            query += ', bukti_bayar = ?';
            params.push(bukti_bayar);
        }

        if (status === 'lunas') {
            query += ', tanggal_bayar = NOW()';
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);
    },
    getTunggakan: async () => {
        const [rows] = await db.query(`
            SELECT i.*, w.nama, w.no_hp, w.blok, w.nomor_rumah
            FROM iuran i 
            JOIN warga w ON i.warga_id = w.id 
            WHERE i.status != 'lunas'
            ORDER BY i.periode ASC
        `);
        return rows;
    },
    generateBillsForMonth: async (periode) => {
        // Generate for Kepala Keluarga only
        const [heads] = await db.query("SELECT id FROM warga WHERE status_keluarga = 'Kepala Keluarga'");
        let count = 0;
        for (const h of heads) {
            try {
                // Iuran Keamanan
                await db.query(
                    'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                    [h.id, periode, 'keamanan', 50000]
                );
                // Iuran Sampah
                await db.query(
                    'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                    [h.id, periode, 'sampah', 20000]
                );
                count += 2;
            } catch (e) {
                // Ignore duplicates
            }
        }
        return count;
    },
    getStatusByHouse: async (warga_id) => {
        // Check if there are any unpaid bills for this head of family
        const [rows] = await db.query(
            "SELECT COUNT(*) as unpaid FROM iuran WHERE warga_id = ? AND status != 'lunas'",
            [warga_id]
        );
        return rows[0].unpaid === 0 ? 'lunas' : 'menunggak';
    }
};

module.exports = Iuran;
