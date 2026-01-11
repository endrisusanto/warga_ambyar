require('dotenv').config();
const db = require('./config/db');

async function reset() {
    console.log('Resetting all attendance status...');
    try {
        await db.query("UPDATE ronda_jadwal SET status = 'scheduled', denda = 0, keterangan = NULL");
        console.log('Attendance status reset to scheduled, fines cleared, remarks cleared.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
