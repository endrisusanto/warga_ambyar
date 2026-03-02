const db = require('../config/db');

const Event = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM agenda ORDER BY tanggal ASC');
        return rows;
    },
    getUpcoming: async (limit = 5) => {
        const [rows] = await db.query('SELECT * FROM agenda WHERE tanggal >= CURDATE() ORDER BY tanggal ASC LIMIT ?', [limit]);
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM agenda WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (data) => {
        const { title, description, date, location } = data;
        const [result] = await db.query(
            'INSERT INTO agenda (judul, keterangan, tanggal, lokasi) VALUES (?, ?, ?, ?)',
            [title, description, date, location]
        );
        return result.insertId;
    },
    update: async (id, data) => {
        const { title, description, date, location } = data;
        await db.query(
            'UPDATE agenda SET judul = ?, keterangan = ?, tanggal = ?, lokasi = ? WHERE id = ?',
            [title, description, date, location, id]
        );
    },
    delete: async (id) => {
        await db.query('DELETE FROM agenda WHERE id = ?', [id]);
    },
    createShare: async (eventId, filename) => {
        const [result] = await db.query(
            'INSERT INTO event_shares (event_id, image_filename) VALUES (?, ?)',
            [eventId, filename]
        );
        return result.insertId;
    },
    getShare: async (id) => {
        const [rows] = await db.query(`
            SELECT es.*, a.judul, a.tanggal, a.lokasi, a.keterangan 
            FROM event_shares es
            LEFT JOIN agenda a ON es.event_id = a.id
            WHERE es.id = ?
        `, [id]);
        return rows[0];
    }
};

module.exports = Event;
