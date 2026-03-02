const db = require('../config/db');

async function migrateOldKasData() {
    try {
        console.log('=== Starting migration of old "kas" entries to "kas_rt" ===');

        // Check current data
        const [checkResult] = await db.query(
            "SELECT COUNT(*) as count FROM iuran WHERE jenis IN ('kas', 'keamanan')"
        );
        console.log(`Found ${checkResult[0].count} rows with old jenis values`);

        // Update all old 'kas' entries to 'kas_rt'
        const [result] = await db.query(
            "UPDATE iuran SET jenis = 'kas_rt' WHERE jenis IN ('kas', 'keamanan')"
        );

        console.log(`✅ Updated ${result.affectedRows} rows from 'kas'/'keamanan' to 'kas_rt'`);

        // Fix amounts for kas_rt and kas_gang
        const [result2] = await db.query(
            "UPDATE iuran SET jumlah = 10000 WHERE jenis IN ('kas_rt', 'kas_gang') AND jumlah != 10000"
        );
        console.log(`✅ Fixed ${result2.affectedRows} kas_rt/kas_gang amounts to 10000`);

        // Fix amounts for sampah
        const [result3] = await db.query(
            "UPDATE iuran SET jumlah = 25000 WHERE jenis = 'sampah' AND jumlah != 25000"
        );
        console.log(`✅ Fixed ${result3.affectedRows} sampah amounts to 25000`);

        console.log('=== Migration completed successfully ===');
    } catch (err) {
        console.error('❌ Old data migration failed:', err);
    }
}

module.exports = migrateOldKasData;
