require('dotenv').config();
const db = require('./config/db');

async function fix() {
    console.log('Removing schedule entries for residents with no team...');
    try {
        const [rows] = await db.query(`
            SELECT r.id, w.nama 
            FROM ronda_jadwal r 
            JOIN warga w ON r.warga_id = w.id 
            WHERE w.tim_ronda IS NULL
        `);

        if (rows.length > 0) {
            console.log(`Found ${rows.length} entries with no team:`);
            rows.forEach(r => console.log(`- ${r.nama} (ID: ${r.id})`));

            const ids = rows.map(r => r.id);
            const placeholder = ids.map(() => '?').join(',');
            await db.query(`DELETE FROM ronda_jadwal WHERE id IN (${placeholder})`, ids);
            console.log(`Deleted ${rows.length} entries.`);
        } else {
            console.log('No entries found.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fix();
