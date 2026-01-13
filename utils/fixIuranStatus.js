const db = require('../config/db');

async function fixIuranStatus() {
    try {
        console.log('Checking status column in iuran table...');

        // Modify column to be VARCHAR(50) to support 'ditolak' and others
        // Default to 'belum_bayar'
        await db.query("ALTER TABLE iuran MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'belum_bayar'");

        console.log('Iuran status column fixed.');
    } catch (err) {
        console.error('Iuran status migration failed:', err);
    }
}

module.exports = fixIuranStatus;
