const db = require('../config/db');

const Event = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM events ORDER BY date ASC');
        return rows;
    },
    getUpcoming: async (limit = 5) => {
        const [rows] = await db.query('SELECT * FROM events WHERE date >= CURDATE() ORDER BY date ASC LIMIT ?', [limit]);
        return rows;
    },
    create: async (data) => {
        const { title, description, date, location } = data;
        const [result] = await db.query(
            'INSERT INTO events (title, description, date, location) VALUES (?, ?, ?, ?)',
            [title, description, date, location]
        );
        return result.insertId;
    }
};

module.exports = Event;
