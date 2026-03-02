const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to Docker MySQL container
const config = {
    host: 'localhost',
    user: 'root',
    password: 'rootpassword',
    database: 'rt_rw_db',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00'
};

async function resetRondaComplete() {
    let pool;
    try {
        console.log('Connecting to Docker MySQL DB...');
        pool = mysql.createPool(config);
        
        // Test connection
        const [testResult] = await pool.query('SELECT 1');
        console.log('Connection successful!');
        
        console.log('Resetting Ronda Database...');

        // 1. Delete all ronda_jadwal
        console.log('Deleting all from ronda_jadwal...');
        const [result1] = await pool.query('DELETE FROM ronda_jadwal');
        console.log(`Deleted ${result1.affectedRows} rows from ronda_jadwal`);
        
        // Reset auto increment
        await pool.query('ALTER TABLE ronda_jadwal AUTO_INCREMENT = 1');
        console.log('Reset auto increment for ronda_jadwal');

        // 2. Delete all ronda_dokumentasi
        try {
            console.log('Deleting all from ronda_dokumentasi...');
            const [result2] = await pool.query('DELETE FROM ronda_dokumentasi');
            console.log(`Deleted ${result2.affectedRows} rows from ronda_dokumentasi`);
            await pool.query('ALTER TABLE ronda_dokumentasi AUTO_INCREMENT = 1');
        } catch (e) {
             console.log('ronda_dokumentasi error (table might not exist):', e.message);
        }
        
        // 3. Delete all ronda_shares
        try {
            console.log('Deleting all from ronda_shares...');
            const [result3] = await pool.query('DELETE FROM ronda_shares');
            console.log(`Deleted ${result3.affectedRows} rows from ronda_shares`);
            await pool.query('ALTER TABLE ronda_shares AUTO_INCREMENT = 1');
        } catch (e) {
             console.log('ronda_shares error (table might not exist):', e.message);
        }

        // Verify
        const [count] = await pool.query('SELECT COUNT(*) as total FROM ronda_jadwal');
        console.log(`\nVerification: ronda_jadwal now has ${count[0].total} rows`);

        console.log('\n✅ All Ronda tables reset successfully!');
        
    } catch (err) {
        console.error('❌ Error resetting ronda:', err);
    } finally {
        if (pool) await pool.end();
    }
}

resetRondaComplete();
