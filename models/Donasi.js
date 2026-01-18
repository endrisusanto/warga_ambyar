const db = require('../config/db');

const Donasi = {
    // Campaign methods
    getAllCampaigns: async () => {
        const [rows] = await db.query(`
            SELECT dc.*, 
                   u.username as creator_name,
                   COALESCE(SUM(CASE WHEN dt.status = 'verified' THEN dt.jumlah ELSE 0 END), 0) as terkumpul,
                   COUNT(CASE WHEN dt.status = 'verified' THEN 1 END) as jumlah_donatur
            FROM donasi_campaign dc
            LEFT JOIN users u ON dc.created_by = u.id
            LEFT JOIN donasi_transaksi dt ON dc.id = dt.campaign_id
            GROUP BY dc.id
            ORDER BY dc.created_at DESC
        `);
        return rows;
    },

    getCampaignById: async (id) => {
        const [rows] = await db.query(`
            SELECT dc.*, 
                   u.username as creator_name,
                   COALESCE(SUM(CASE WHEN dt.status = 'verified' THEN dt.jumlah ELSE 0 END), 0) as terkumpul,
                   COUNT(CASE WHEN dt.status = 'verified' THEN 1 END) as jumlah_donatur
            FROM donasi_campaign dc
            LEFT JOIN users u ON dc.created_by = u.id
            LEFT JOIN donasi_transaksi dt ON dc.id = dt.campaign_id
            WHERE dc.id = ?
            GROUP BY dc.id
        `, [id]);
        return rows[0];
    },

    createCampaign: async (data) => {
        const { judul, deskripsi, target_dana, foto, tanggal_mulai, tanggal_selesai, created_by } = data;
        const [result] = await db.query(
            `INSERT INTO donasi_campaign (judul, deskripsi, target_dana, foto, tanggal_mulai, tanggal_selesai, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [judul, deskripsi, target_dana, foto, tanggal_mulai, tanggal_selesai, created_by]
        );
        return result.insertId;
    },

    updateCampaign: async (id, data) => {
        const { judul, deskripsi, target_dana, foto, tanggal_mulai, tanggal_selesai, status } = data;
        await db.query(
            `UPDATE donasi_campaign 
             SET judul = ?, deskripsi = ?, target_dana = ?, foto = ?, 
                 tanggal_mulai = ?, tanggal_selesai = ?, status = ?
             WHERE id = ?`,
            [judul, deskripsi, target_dana, foto, tanggal_mulai, tanggal_selesai, status, id]
        );
    },

    deleteCampaign: async (id) => {
        await db.query('DELETE FROM donasi_campaign WHERE id = ?', [id]);
    },

    // Transaction methods
    getDonaturByCampaign: async (campaignId, showReal = false) => {
        const [rows] = await db.query(`
            SELECT dt.*,
                   u.username,
                   w.nama as warga_nama,
                   v.username as verifier_name
            FROM donasi_transaksi dt
            LEFT JOIN users u ON dt.user_id = u.id
            LEFT JOIN warga w ON u.warga_id = w.id
            LEFT JOIN users v ON dt.verified_by = v.id
            WHERE dt.campaign_id = ? AND dt.status = 'verified'
            ORDER BY dt.created_at DESC
        `, [campaignId]);

        // Mask nama if anonim and not showing real names
        if (!showReal) {
            rows.forEach(row => {
                if (row.is_anonim) {
                    row.nama_donatur = 'Hamba Allah';
                }
            });
        }
        return rows;
    },

    createDonasi: async (data) => {
        const { campaign_id, user_id, nama_donatur, is_anonim, jumlah, metode_bayar, bukti_bayar, pesan } = data;
        const [result] = await db.query(
            `INSERT INTO donasi_transaksi 
             (campaign_id, user_id, nama_donatur, is_anonim, jumlah, metode_bayar, bukti_bayar, pesan) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [campaign_id, user_id, nama_donatur, is_anonim ? 1 : 0, jumlah, metode_bayar, bukti_bayar, pesan]
        );
        return result.insertId;
    },

    getPendingDonasi: async () => {
        const [rows] = await db.query(`
            SELECT dt.*,
                   dc.judul as campaign_judul,
                   u.username,
                   w.nama as warga_nama
            FROM donasi_transaksi dt
            JOIN donasi_campaign dc ON dt.campaign_id = dc.id
            LEFT JOIN users u ON dt.user_id = u.id
            LEFT JOIN warga w ON u.warga_id = w.id
            WHERE dt.status = 'pending'
            ORDER BY dt.created_at DESC
        `);
        return rows;
    },

    verifyDonasi: async (id, verified_by, status) => {
        await db.query(
            `UPDATE donasi_transaksi 
             SET status = ?, verified_by = ?, verified_at = NOW()
             WHERE id = ?`,
            [status, verified_by, id]
        );
    },

    getDonasiById: async (id) => {
        const [rows] = await db.query(`
            SELECT dt.*,
                   dc.judul as campaign_judul,
                   u.username,
                   w.nama as warga_nama
            FROM donasi_transaksi dt
            JOIN donasi_campaign dc ON dt.campaign_id = dc.id
            LEFT JOIN users u ON dt.user_id = u.id
            LEFT JOIN warga w ON u.warga_id = w.id
            WHERE dt.id = ?
        `, [id]);
        return rows[0];
    },

    // Financial report for donasi
    getLaporanKeuangan: async (campaignId = null) => {
        let query = `
            SELECT dt.*, dc.judul as campaign_judul
            FROM donasi_transaksi dt
            JOIN donasi_campaign dc ON dt.campaign_id = dc.id
            WHERE dt.status = 'verified'
        `;
        const params = [];

        if (campaignId) {
            query += ' AND dt.campaign_id = ?';
            params.push(campaignId);
        }

        query += ' ORDER BY dt.verified_at DESC';

        const [rows] = await db.query(query, params);
        return rows;
    },

    // Pengeluaran (Expense) methods
    createPengeluaran: async (data) => {
        const { campaign_id, tanggal, deskripsi, kategori, jumlah, bukti, created_by } = data;
        const [result] = await db.query(
            `INSERT INTO donasi_pengeluaran 
             (campaign_id, tanggal, deskripsi, kategori, jumlah, bukti, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [campaign_id, tanggal, deskripsi, kategori, jumlah, bukti, created_by]
        );
        return result.insertId;
    },

    getPengeluaranByCampaign: async (campaignId) => {
        const [rows] = await db.query(`
            SELECT dp.*, u.username as creator_name
            FROM donasi_pengeluaran dp
            LEFT JOIN users u ON dp.created_by = u.id
            WHERE dp.campaign_id = ?
            ORDER BY dp.tanggal DESC
        `, [campaignId]);
        return rows;
    },

    updatePengeluaran: async (id, data) => {
        const { tanggal, deskripsi, kategori, jumlah, bukti } = data;
        await db.query(
            `UPDATE donasi_pengeluaran 
             SET tanggal = ?, deskripsi = ?, kategori = ?, jumlah = ?, bukti = ?
             WHERE id = ?`,
            [tanggal, deskripsi, kategori, jumlah, bukti, id]
        );
    },

    deletePengeluaran: async (id) => {
        await db.query('DELETE FROM donasi_pengeluaran WHERE id = ?', [id]);
    },

    getPengeluaranById: async (id) => {
        const [rows] = await db.query(`
            SELECT dp.*, dc.judul as campaign_judul, u.username as creator_name
            FROM donasi_pengeluaran dp
            JOIN donasi_campaign dc ON dp.campaign_id = dc.id
            LEFT JOIN users u ON dp.created_by = u.id
            WHERE dp.id = ?
        `, [id]);
        return rows[0];
    },

    // Neraca (Balance Sheet) for campaign
    getNeraca: async (campaignId) => {
        // Get total pemasukan (verified donations)
        const [pemasukan] = await db.query(`
            SELECT COALESCE(SUM(jumlah), 0) as total
            FROM donasi_transaksi
            WHERE campaign_id = ? AND status = 'verified'
        `, [campaignId]);

        // Get total pengeluaran
        const [pengeluaran] = await db.query(`
            SELECT COALESCE(SUM(jumlah), 0) as total
            FROM donasi_pengeluaran
            WHERE campaign_id = ?
        `, [campaignId]);

        return {
            pemasukan: parseFloat(pemasukan[0].total),
            pengeluaran: parseFloat(pengeluaran[0].total),
            saldo: parseFloat(pemasukan[0].total) - parseFloat(pengeluaran[0].total)
        };
    }
};

module.exports = Donasi;

