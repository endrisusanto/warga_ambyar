const db = require('./config/db');

async function checkColumns() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM ronda_jadwal");
        console.log("Columns in ronda_jadwal:");
        rows.forEach(row => {
            console.log(`- ${row.Field} (${row.Type})`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
