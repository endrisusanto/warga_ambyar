const db = require('../config/db');

const Banjir = {
    createShare: async (filename) => {
        const [result] = await db.query("INSERT INTO banjir_shares (image_filename, created_at) VALUES (?, NOW())", [filename]);
        return result.insertId;
    },

    getShare: async (id) => {
        const [rows] = await db.query("SELECT * FROM banjir_shares WHERE id = ?", [id]);
        return rows[0];
    },

    // Ensure table exists
    initTable: async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS banjir_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_filename VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
};

module.exports = Banjir;
