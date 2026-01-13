const db = require('../config/db');

async function updateIuranJenis() {
    try {
        console.log('Updating iuran jenis column to support Kas Gang...');

        // Check current column definition
        const [columns] = await db.query("SHOW COLUMNS FROM iuran LIKE 'jenis'");
        console.log('Current jenis column:', columns);

        // Modify column to VARCHAR to support new types
        await db.query("ALTER TABLE iuran MODIFY COLUMN jenis VARCHAR(50) NOT NULL");

        console.log('Iuran jenis column updated successfully.');
    } catch (err) {
        console.error('Iuran jenis migration failed:', err);
    }
}

module.exports = updateIuranJenis;
