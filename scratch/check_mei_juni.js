require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("Checking ALL rows in ronda_jadwal for May and June 2026...");
        const [rows] = await db.query(`
            SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal BETWEEN '2026-05-01' AND '2026-06-30'
            ORDER BY r.tanggal ASC, r.id ASC
        `);

        rows.forEach(r => {
            console.log(`ID: ${r.id} | Date: ${moment(r.tanggal).format('YYYY-MM-DD')} | Warga: ${r.nama} (Team ${r.tim_ronda}) | Status: ${r.status} | Ket: ${r.keterangan}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
