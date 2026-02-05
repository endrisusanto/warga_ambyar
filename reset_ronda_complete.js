const db = require('./config/db');

async function resetRonda() {
    try {
        console.log('Resetting Ronda Database...');

        // 1. Reset Jadwal
        console.log('Truncating ronda_jadwal...');
        try {
            await db.query('TRUNCATE TABLE ronda_jadwal');
        } catch (e) {
            console.log('Error truncating ronda_jadwal, trying DELETE:', e.message);
            await db.query('DELETE FROM ronda_jadwal');
            await db.query('ALTER TABLE ronda_jadwal AUTO_INCREMENT = 1');
        }

        // 2. Reset Dokumentasi
        console.log('Truncating ronda_dokumentasi...');
        try {
            await db.query('TRUNCATE TABLE ronda_dokumentasi');
        } catch (e) {
             console.log('Error truncating ronda_dokumentasi (table might not exist or other error):', e.message);
        }
        
        // 3. Reset Shares
        console.log('Truncating ronda_shares...');
        try {
            await db.query('TRUNCATE TABLE ronda_shares');
        } catch (e) {
             console.log('Error truncating ronda_shares (table might not exist or other error):', e.message);
        }

        console.log('All Ronda tables reset successfully.');
        console.log('Start date is already configured to 2026 in models/Ronda.js');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting ronda:', err);
        process.exit(1);
    }
}

resetRonda();
