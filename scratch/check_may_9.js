require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("All rows for 2026-05-09:");
        const [rows] = await db.query(`
            SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal = '2026-05-09'
            ORDER BY w.tim_ronda ASC, r.id ASC
        `);

        rows.forEach(r => {
            console.log(`ID: ${r.id} | Warga: ${r.nama} (Team: ${r.tim_ronda}) | Status: ${r.status} | Ket: ${r.keterangan}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
