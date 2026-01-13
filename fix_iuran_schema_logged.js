const db = require('./config/db');
const fs = require('fs');

async function fixSchema() {
    try {
        fs.writeFileSync('migration_log.txt', 'Starting migration...\n');

        const [columns] = await db.query("SHOW COLUMNS FROM iuran LIKE 'dibayar_oleh'");
        fs.appendFileSync('migration_log.txt', `Columns found: ${JSON.stringify(columns)}\n`);

        if (columns.length === 0) {
            fs.appendFileSync('migration_log.txt', 'Adding dibayar_oleh column...\n');
            await db.query("ALTER TABLE iuran ADD COLUMN dibayar_oleh INT DEFAULT NULL");

            fs.appendFileSync('migration_log.txt', 'Adding FK constraint...\n');
            await db.query("ALTER TABLE iuran ADD CONSTRAINT fk_iuran_payer FOREIGN KEY (dibayar_oleh) REFERENCES warga(id) ON DELETE SET NULL");

            fs.appendFileSync('migration_log.txt', 'Migration successful\n');
        } else {
            fs.appendFileSync('migration_log.txt', 'Column dibayar_oleh already exists.\n');
        }
        process.exit(0);
    } catch (err) {
        fs.appendFileSync('migration_log.txt', `Migration failed: ${err.message}\n`);
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

fixSchema();
