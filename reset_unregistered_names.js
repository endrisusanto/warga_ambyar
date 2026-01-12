const db = require('./config/db');

async function resetNames() {
    console.log('Starting reset of unregistered warga names...');
    try {
        // Update nama for warga without users
        const [result] = await db.query(`
            UPDATE warga w
            LEFT JOIN users u ON w.id = u.warga_id
            SET w.nama = CONCAT('Blok ', w.blok, ' - ', w.nomor_rumah)
            WHERE u.id IS NULL
        `);

        console.log(`Updated ${result.changedRows} rows.`);

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

resetNames();
