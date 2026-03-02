const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00'
};

async function resetRonda() {
    let pool;
    try {
        console.log('Connecting to DB...');
        pool = mysql.createPool(config);
        
        console.log('Resetting Ronda Database...');

        try {
            await pool.query('TRUNCATE TABLE ronda_jadwal');
            console.log('Truncated ronda_jadwal');
        } catch (e) {
            console.log('TRUNCATE failed, trying DELETE:', e.message);
            await pool.query('DELETE FROM ronda_jadwal');
            try { await pool.query('ALTER TABLE ronda_jadwal AUTO_INCREMENT = 1'); } catch(ex) {}
        }

        try {
            await pool.query('TRUNCATE TABLE ronda_dokumentasi');
            console.log('Truncated ronda_dokumentasi');
        } catch (e) {
             console.log('ronda_dokumentasi error:', e.message);
        }
        
        try {
            await pool.query('TRUNCATE TABLE ronda_shares');
             console.log('Truncated ronda_shares');
        } catch (e) {
             console.log('ronda_shares error:', e.message);
        }

        console.log('All Ronda tables reset successfully.');
        
    } catch (err) {
        console.error('Error resetting ronda:', err);
    } finally {
        if (pool) await pool.end();
    }
}

resetRonda();
