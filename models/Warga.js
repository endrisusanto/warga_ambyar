const db = require('../config/db');

const Warga = {
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT w.*, u.role, u.username 
            FROM warga w 
            LEFT JOIN users u ON u.warga_id = w.id 
            ORDER BY CASE WHEN w.approval_status = 'pending' THEN 0 ELSE 1 END, w.blok, w.nomor_rumah, w.status_keluarga
        `);
        return rows;
    },
    findById: async (id) => {
        const [rows] = await db.query(`
            SELECT w.*, u.role, u.username 
            FROM warga w 
            LEFT JOIN users u ON u.warga_id = w.id 
            WHERE w.id = ?
        `, [id]);
        return rows[0];
    },
    create: async (data) => {
        const { nama, blok, nomor_rumah, status_keluarga, no_hp, email, status_huni, is_ronda, approval_status } = data;
        const [result] = await db.query(
            'INSERT INTO warga (nama, blok, nomor_rumah, status_keluarga, no_hp, email, status_huni, is_ronda, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nama, blok, nomor_rumah, status_keluarga, no_hp, email || null, status_huni, is_ronda ? 1 : 0, approval_status || 'approved']
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { nama, blok, nomor_rumah, status_keluarga, no_hp, email, status_huni, is_ronda } = data;
        await db.query(
            'UPDATE warga SET nama = ?, blok = ?, nomor_rumah = ?, status_keluarga = ?, no_hp = ?, email = ?, status_huni = ?, is_ronda = ? WHERE id = ?',
            [nama, blok, nomor_rumah, status_keluarga, no_hp, email || null, status_huni, is_ronda ? 1 : 0, id]
        );
    },
    delete: async (id) => {
        await db.query('DELETE FROM warga WHERE id = ?', [id]);
    },
    getHeadsOfFamily: async () => {
        const [rows] = await db.query(`
            SELECT w.*, 
                   (SELECT status_huni FROM warga w2 
                    WHERE w2.blok = w.blok AND w2.nomor_rumah = w.nomor_rumah 
                    ORDER BY FIELD(status_huni, 'kontrak', 'tetap', 'kosong', 'tidak huni') LIMIT 1) as status_huni
            FROM warga w 
            WHERE w.status_keluarga = 'Kepala Keluarga' 
            ORDER BY w.blok, w.nomor_rumah
        `);
        return rows;
    },
    getByHouse: async (blok, nomor_rumah) => {
        const [rows] = await db.query('SELECT * FROM warga WHERE blok = ? AND nomor_rumah = ?', [blok, nomor_rumah]);
        return rows;
    },
    getRondaEligible: async () => {
        const [rows] = await db.query("SELECT * FROM warga WHERE is_ronda = 1 ORDER BY blok, nomor_rumah");
        return rows;
    },
    updateRole: async (wargaId, role) => {
        try {
            // Check if user exists
            const [users] = await db.query('SELECT id FROM users WHERE warga_id = ?', [wargaId]);

            if (users.length > 0) {
                // Update existing user
                await db.query('UPDATE users SET role = ? WHERE warga_id = ?', [role, wargaId]);
            } else {
                // Create placeholder user so role can be assigned
                const username = `user_warga_${wargaId}`;
                const password = '$2b$10$EpOu/yQ.d.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0'; // Dummy hash

                // Use INSERT IGNORE to prevent race conditions, though unlikely
                await db.query(
                    'INSERT IGNORE INTO users (username, password, role, warga_id) VALUES (?, ?, ?, ?)',
                    [username, password, role, wargaId]
                );

                // If INSERT IGNORE ignored it (because it exists now), update the role
                await db.query('UPDATE users SET role = ? WHERE warga_id = ?', [role, wargaId]);
            }
        } catch (error) {
            console.error('Error in Warga.updateRole:', error);
            throw error;
        }
    },
    updateApprovalStatus: async (id, status) => {
        await db.query('UPDATE warga SET approval_status = ? WHERE id = ?', [status, id]);
    },
    toggleRonda: async (id) => {
        await db.query('UPDATE warga SET is_ronda = NOT is_ronda WHERE id = ?', [id]);
    },
    countPending: async () => {
        const [rows] = await db.query("SELECT COUNT(*) as count FROM warga WHERE approval_status = 'pending'");
        return Number(rows[0].count);
    },
    getPending: async () => {
        const [rows] = await db.query("SELECT * FROM warga WHERE approval_status = 'pending' ORDER BY created_at DESC");
        return rows;
    }
};

module.exports = Warga;
