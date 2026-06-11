require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("Ronda_jadwal entries in May and June (ID 6700 to 6840):");
        const [rows] = await db.query(`
            SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, r.created_at, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.id BETWEEN 6700 AND 6840
            ORDER BY r.id ASC
        `);

        rows.forEach(r => {
            console.log(`ID: ${r.id} | Date: ${moment(r.tanggal).format('YYYY-MM-DD')} | Warga: ${r.nama} (Team: ${r.tim_ronda}) | Status: ${r.status} | Created At: ${moment(r.created_at).format('YYYY-MM-DD HH:mm:ss')} | Ket: ${r.keterangan}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
