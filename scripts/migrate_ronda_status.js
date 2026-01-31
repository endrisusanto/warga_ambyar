const mysql = require('mysql2/promise');
require('dotenv').config();

const migrate = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'rootpassword',
            database: process.env.DB_NAME || 'rt_rw_db',
            port: process.env.DB_PORT || 3306
        });

        console.log('Migrating Ronda Tables...');

        // Add status_bayar to ronda_jadwal
        try {
            await connection.query("ALTER TABLE ronda_jadwal ADD COLUMN status_bayar ENUM('pending', 'paid', 'rejected') DEFAULT NULL");
            console.log('✅ Added status_bayar column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ status_bayar column already exists');
            } else {
                console.error('Error adding status_bayar:', e);
            }
        }

        // Add bukti_bayar to ronda_jadwal (just in case)
        try {
            await connection.query("ALTER TABLE ronda_jadwal ADD COLUMN bukti_bayar VARCHAR(255) NULL");
            console.log('✅ Added bukti_bayar column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ bukti_bayar column already exists');
            } else {
                console.error('Error adding bukti_bayar:', e);
            }
        }

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
