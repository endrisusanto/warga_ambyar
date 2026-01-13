const db = require('./config/db');

async function fixSchema() {
    try {
        console.log('Checking schema...');
        const [columns] = await db.query("SHOW COLUMNS FROM iuran LIKE 'dibayar_oleh'");

        if (columns.length === 0) {
            console.log('Adding dibayar_oleh column...');
            await db.query("ALTER TABLE iuran ADD COLUMN dibayar_oleh INT DEFAULT NULL");
            console.log('Adding FK constraint...');
            await db.query("ALTER TABLE iuran ADD CONSTRAINT fk_iuran_payer FOREIGN KEY (dibayar_oleh) REFERENCES warga(id) ON DELETE SET NULL");
            console.log('Migration successful');
        } else {
            console.log('Column dibayar_oleh already exists.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

fixSchema();
