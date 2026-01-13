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
        // Generate for ONE representative per house (prioritize Kepala Keluarga)
        const [houses] = await db.query(`
            SELECT 
                w.blok, 
                w.nomor_rumah,
                (
                    SELECT id FROM warga w2 
                    WHERE w2.blok = w.blok AND w2.nomor_rumah = w.nomor_rumah 
                    ORDER BY CASE WHEN status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END, id ASC 
                    LIMIT 1
                ) as representative_id
            FROM warga w
            GROUP BY w.blok, w.nomor_rumah
        `);

        let count = 0;
        for (const h of houses) {
            if (!h.representative_id) continue;

            // Iuran Kas RT
            try {
                await db.query(
                    'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                    [h.representative_id, periode, 'kas_rt', 10000]
                );
                count++;
            } catch (e) {
                // Ignore duplicates
            }

            // Iuran Kas Gang
            try {
                await db.query(
                    'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                    [h.representative_id, periode, 'kas_gang', 10000]
                );
                count++;
            } catch (e) {
                // Ignore duplicates
            }

            // Iuran Sampah
            try {
                await db.query(
                    'INSERT INTO iuran (warga_id, periode, jenis, jumlah) VALUES (?, ?, ?, ?)',
                    [h.representative_id, periode, 'sampah', 25000]
                );
                count++;
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
    },
    getUnpaidDetails: async (warga_id) => {
        const [rows] = await db.query(
            "SELECT periode, jenis, jumlah FROM iuran WHERE warga_id = ? AND status != 'lunas' ORDER BY periode DESC",
            [warga_id]
        );
        return rows;
    }
};

module.exports = Iuran;
