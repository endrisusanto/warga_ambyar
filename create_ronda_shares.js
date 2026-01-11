require('dotenv').config();
const db = require('./config/db');

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS ronda_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                image_filename VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('ronda_shares table created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
createTable();
