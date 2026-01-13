require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanup() {
    console.log('Connecting to DB...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    console.log('Connected.');

    try {
        console.log('Starting cleanup of duplicate KAS entries...');

        // 1. Find all 'kas' entries
        const [oldKas] = await connection.query("SELECT * FROM iuran WHERE jenis = 'kas' OR jenis = 'keamanan'");
        console.log(`Found ${oldKas.length} old 'kas'/'keamanan' entries.`);

        for (const item of oldKas) {
            // 2. Check if 'kas_rt' exists for same warga and periode
            const [existing] = await connection.query(
                "SELECT id FROM iuran WHERE warga_id = ? AND periode = ? AND jenis = 'kas_rt'",
                [item.warga_id, item.periode]
            );

            if (existing.length > 0) {
                // Duplicate found! Delete the old one.
                console.log(`Duplicate found for Warga ${item.warga_id} Periode ${item.periode}. Deleting old entry ID ${item.id}...`);
                await connection.query("DELETE FROM iuran WHERE id = ?", [item.id]);
            } else {
                // No duplicate, so this old entry should be migrated to 'kas_rt'
                console.log(`Migrating old entry ID ${item.id} to 'kas_rt'...`);
                await connection.query("UPDATE iuran SET jenis = 'kas_rt' WHERE id = ?", [item.id]);
            }
        }

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

cleanup();
