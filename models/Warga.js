const db = require('../config/db');

const Warga = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM warga ORDER BY blok, nomor_rumah, status_keluarga');
        return rows;
    },
    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM warga WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (data) => {
        const { nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda } = data;
        const [result] = await db.query(
            'INSERT INTO warga (nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda ? 1 : 0]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda } = data;
        await db.query(
            'UPDATE warga SET nama = ?, blok = ?, nomor_rumah = ?, status_keluarga = ?, no_hp = ?, status_huni = ?, is_ronda = ? WHERE id = ?',
            [nama, blok, nomor_rumah, status_keluarga, no_hp, status_huni, is_ronda ? 1 : 0, id]
        );
    },
    delete: async (id) => {
        await db.query('DELETE FROM warga WHERE id = ?', [id]);
    },
    getHeadsOfFamily: async () => {
        const [rows] = await db.query("SELECT * FROM warga WHERE status_keluarga = 'Kepala Keluarga' ORDER BY blok, nomor_rumah");
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
    updateRole: async (id, role) => {
        await db.query('UPDATE warga SET role = ? WHERE id = ?', [role, id]);
    },
    updateApprovalStatus: async (id, status) => {
        await db.query('UPDATE warga SET approval_status = ? WHERE id = ?', [status, id]);
    }
};

module.exports = Warga;
