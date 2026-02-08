const db = require('./config/db');

async function checkTable() {
    try {
        console.log('Checking ronda_jadwal table...');
        const [rows] = await db.query("SHOW TABLES LIKE 'ronda_jadwal'");
        if (rows.length === 0) {
            console.log('Table ronda_jadwal DOES NOT exist.');
        } else {
            console.log('Table ronda_jadwal exists.');
            const [columns] = await db.query("DESCRIBE ronda_jadwal");
            console.log('Columns:', columns.map(c => c.Field).join(', '));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkTable();
