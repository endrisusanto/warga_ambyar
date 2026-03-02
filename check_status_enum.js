const db = require('./config/db');

async function checkIuranStatus() {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM iuran LIKE 'status'");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkIuranStatus();
