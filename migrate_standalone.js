const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log('Starting standalone migration...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to DB.');

        try {
            await connection.query("ALTER TABLE ronda_jadwal ADD COLUMN bukti_bayar VARCHAR(255) NULL");
            console.log('Added bukti_bayar');
        } catch (e) {
            console.log('bukti_bayar might exist:', e.code);
        }

        try {
            await connection.query("ALTER TABLE ronda_jadwal ADD COLUMN status_bayar ENUM('pending', 'paid', 'rejected') DEFAULT NULL");
            console.log('Added status_bayar');
        } catch (e) {
            console.log('status_bayar might exist:', e.code);
        }

        await connection.end();
        console.log('Migration finished.');
        process.exit(0);
    } catch (e) {
        console.error('Migration fatal error:', e);
        process.exit(1);
    }
}

migrate();
