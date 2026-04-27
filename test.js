const db = require('./config/db');
async function test() {
    const [rows] = await db.query('SELECT foto_bukti FROM ronda_jadwal LIMIT 10');
    console.log(rows);
    process.exit();
}
test();
