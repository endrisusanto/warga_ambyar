const db = require('./config/db');

async function migrate() {
    try {
        console.log('Checking ronda_jadwal table...');

        // Add bukti_bayar column
        try {
            await db.query("ALTER TABLE ronda_jadwal ADD COLUMN bukti_bayar VARCHAR(255) NULL");
            console.log('Added bukti_bayar column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('bukti_bayar column already exists.');
            } else {
                console.error('Error adding bukti_bayar:', e.message);
            }
        }

        // Add status_bayar column
        try {
            await db.query("ALTER TABLE ronda_jadwal ADD COLUMN status_bayar ENUM('pending', 'paid', 'rejected') DEFAULT NULL");
            console.log('Added status_bayar column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('status_bayar column already exists.');
            } else {
                console.error('Error adding status_bayar:', e.message);
            }
        }

        console.log('Migration complete.');
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        await db.end();
        process.exit(1);
    }
}

migrate();
