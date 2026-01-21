require('dotenv').config();
const db = require('./config/db');

async function createPengaduanTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS pengaduan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                warga_id INT,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT NOT NULL,
                foto VARCHAR(255),
                is_anonim BOOLEAN DEFAULT FALSE,
                status ENUM('pending', 'proses', 'selesai', 'ditolak') DEFAULT 'pending',
                tanggapan TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL
            )
        `);
        console.log('Table pengaduan created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createPengaduanTable();
