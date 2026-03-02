const db = require('../config/db');

async function migrateEmailWarga() {
    try {
        console.log('Checking email column in warga table...');

        const [columns] = await db.query("SHOW COLUMNS FROM warga LIKE 'email'");
        if (columns.length === 0) {
            console.log('Adding email column to warga table...');
            await db.query("ALTER TABLE warga ADD COLUMN email VARCHAR(255) DEFAULT NULL");
        } else {
            console.log('email column already exists in warga table.');
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

module.exports = migrateEmailWarga;
