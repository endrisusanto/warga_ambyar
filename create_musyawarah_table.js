require('dotenv').config();
const db = require('./config/db');

async function up() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS musyawarah (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                konten LONGTEXT,
                lampiran VARCHAR(255),
                tanggal DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table musyawarah created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
up();
