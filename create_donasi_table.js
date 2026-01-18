require('dotenv').config();
const db = require('./config/db');

async function createDonasiTables() {
    try {
        // Table untuk campaign donasi
        await db.query(`
            CREATE TABLE IF NOT EXISTS donasi_campaign (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT,
                target_dana DECIMAL(15, 2) DEFAULT 0,
                foto VARCHAR(255),
                tanggal_mulai DATETIME NOT NULL,
                tanggal_selesai DATETIME,
                status ENUM('aktif', 'selesai', 'ditutup') DEFAULT 'aktif',
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Table donasi_campaign created');

        // Table untuk transaksi donasi
        await db.query(`
            CREATE TABLE IF NOT EXISTS donasi_transaksi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                user_id INT,
                nama_donatur VARCHAR(100),
                is_anonim BOOLEAN DEFAULT FALSE,
                jumlah DECIMAL(15, 2) NOT NULL,
                metode_bayar ENUM('qris', 'transfer') NOT NULL,
                bukti_bayar VARCHAR(255),
                pesan TEXT,
                status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                verified_by INT,
                verified_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES donasi_campaign(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('Table donasi_transaksi created');

        console.log('All donasi tables created successfully');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createDonasiTables();
