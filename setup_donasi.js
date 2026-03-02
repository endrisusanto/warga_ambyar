require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDonasiFeature() {
    let connection;

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

        // 2. Connect to database with production-friendly config
        console.log('\n2. Connecting to database...');

        // Use configured host or default to localhost
        const dbHost = process.env.DB_HOST || 'localhost';

        const dbConfig = {
            host: dbHost,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'warga_ambyar',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };

        console.log(`Connecting to: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);

        connection = await mysql.createConnection(dbConfig);
        console.log('✓ Database connected');

        // 3. Create donasi_campaign table
        console.log('\n3. Creating donasi_campaign table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS donasi_campaign (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT,
                target_dana DECIMAL(15, 2) DEFAULT 0,
                terkumpul DECIMAL(15, 2) DEFAULT 0,
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

        // 4. Create donasi_transaksi table
        console.log('\n4. Creating donasi_transaksi table...');
        await connection.query(`
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

        // 5. Create donasi_pengeluaran table
        console.log('\n5. Creating donasi_pengeluaran table...');
        await connection.query(`
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

        // 6. Verify tables
        console.log('\n6. Verifying tables...');
        const [tables] = await connection.query("SHOW TABLES LIKE 'donasi%'");
        console.log(`✓ Found ${tables.length} donasi tables:`);
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`  - ${tableName}`);
        });

        await connection.end();

        console.log('\n=== Donasi Feature Setup Complete ===');
        console.log('\nNext steps:');
        console.log('1. Restart your application (pm2 restart / systemctl restart)');
        console.log('2. Access /donasi to create your first campaign');
        console.log('3. Check that upload folders have proper permissions');
        console.log('\nIf using Apache/Nginx, ensure permissions:');
        console.log('  chmod -R 755 public/uploads/donasi');
        console.log('  chown -R www-data:www-data public/uploads/donasi');

        process.exit(0);
    } catch (e) {
        console.error('\n❌ Error during setup:', e.message);

        if (e.code === 'ECONNREFUSED') {
            console.error('\n💡 Database connection refused. Check:');
            console.error('   - Is MySQL running? (sudo systemctl status mysql)');
            console.error('   - Is DB_HOST correct in .env?');
            console.error('   - Are credentials correct?');
        } else if (e.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Access denied. Check:');
            console.error('   - DB_USER and DB_PASSWORD in .env');
            console.error('   - MySQL user permissions');
        } else if (e.code === 'ER_BAD_DB_ERROR') {
            console.error('\n💡 Database does not exist. Create it:');
            console.error('   mysql -u root -p -e "CREATE DATABASE warga_ambyar;"');
        }

        console.error('\nFull error:', e);

        if (connection) {
            await connection.end();
        }

        process.exit(1);
    }
}

setupDonasiFeature();
