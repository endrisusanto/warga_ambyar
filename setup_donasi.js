require('dotenv').config();
const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setupDonasiFeature() {
    try {
        console.log('=== Setting up Donasi Feature ===');

        // 1. Create upload directories
        console.log('\n1. Creating upload directories...');
        const uploadDirs = [
            './public/uploads/donasi',
            './public/uploads/donasi/bukti',
            './public/uploads/donasi/pengeluaran',
            './public/uploads/donasi/campaign'
        ];

        uploadDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✓ Created: ${dir}`);
            } else {
                console.log(`✓ Exists: ${dir}`);
            }
        });

        // 2. Create donasi_campaign table
        console.log('\n2. Creating donasi_campaign table...');
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
        console.log('✓ Table donasi_campaign created/verified');

        // 3. Create donasi_transaksi table
        console.log('\n3. Creating donasi_transaksi table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS donasi_transaksi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                user_id INT,
                nama_donatur VARCHAR(100),
                is_anonim BOOLEAN DEFAULT FALSE,
                jumlah DECIMAL(15, 2) NOT NULL,
                metode_bayar ENUM('qris', 'transfer', 'dana') NOT NULL,
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
        console.log('✓ Table donasi_transaksi created/verified');

        // 4. Create donasi_pengeluaran table
        console.log('\n4. Creating donasi_pengeluaran table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS donasi_pengeluaran (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                tanggal DATETIME NOT NULL,
                deskripsi TEXT NOT NULL,
                kategori VARCHAR(50),
                jumlah DECIMAL(15, 2) NOT NULL,
                bukti VARCHAR(255),
                created_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES donasi_campaign(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✓ Table donasi_pengeluaran created/verified');

        // 5. Add terkumpul column to donasi_campaign if not exists
        console.log('\n5. Checking donasi_campaign columns...');
        try {
            await db.query(`
                ALTER TABLE donasi_campaign 
                ADD COLUMN terkumpul DECIMAL(15, 2) DEFAULT 0 AFTER target_dana
            `);
            console.log('✓ Added terkumpul column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ Column terkumpul already exists');
            } else {
                throw e;
            }
        }

        console.log('\n=== Donasi Feature Setup Complete ===');
        console.log('\nNext steps:');
        console.log('1. Restart your application');
        console.log('2. Access /donasi to create your first campaign');
        console.log('3. Check that upload folders have proper permissions');

        process.exit(0);
    } catch (e) {
        console.error('\n❌ Error during setup:', e.message);
        console.error(e);
        process.exit(1);
    }
}

setupDonasiFeature();
