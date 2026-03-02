const db = require('./config/db');

async function resetData() {
    try {
        console.log('Resetting Keuangan (Kas)...');
        await db.query('TRUNCATE TABLE kas');

        console.log('Resetting Absen Ronda & Denda...');
        // Reset status to 'scheduled', clear fines, payments, photos, etc.
        await db.query(`
            UPDATE ronda_jadwal 
            SET status = 'scheduled', 
                denda = 0, 
                status_bayar = NULL, 
                bukti_bayar = NULL, 
                foto_bukti = NULL, 
                keterangan = NULL
        `);

        console.log('Clearing Ronda Documentation...');
        await db.query('TRUNCATE TABLE ronda_dokumentasi');

        console.log('Data reset successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting data:', error);
        process.exit(1);
    }
}

resetData();
