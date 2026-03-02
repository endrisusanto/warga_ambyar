require('dotenv').config();
const db = require('./config/db');

async function createPengeluaranTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS donasi_pengeluaran (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                tanggal DATETIME NOT NULL,
                deskripsi VARCHAR(255) NOT NULL,
                kategori VARCHAR(50),
                jumlah DECIMAL(15, 2) NOT NULL,
                bukti VARCHAR(255),
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES donasi_campaign(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Table donasi_pengeluaran created successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createPengeluaranTable();
