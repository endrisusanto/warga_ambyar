const mysql = require('mysql2/promise');

const setupTables = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'rootpassword',
            database: 'rt_rw_db',
            port: 3306
        });

        console.log('Setting up Pengaduan Tables...');

        // Create pengaduan table
        await connection.query(`
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
        console.log('✅ Table pengaduan created/verified');

        // Create pengaduan_comments table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pengaduan_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pengaduan_id INT NOT NULL,
                user_id INT,
                parent_id INT,
                konten TEXT NOT NULL,
                type ENUM('comment', 'log') DEFAULT 'comment',
                lampiran VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pengaduan_id) REFERENCES pengaduan(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (parent_id) REFERENCES pengaduan_comments(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table pengaduan_comments created/verified');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error setting up tables:', error);
        process.exit(1);
    }
};

setupTables();
