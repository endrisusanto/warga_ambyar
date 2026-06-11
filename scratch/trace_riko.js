require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("Schedule history for Riko (warga_id = 38 or whatever):");
        const [history] = await db.query(`
            SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, w.nama
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE w.nama = 'Riko'
            ORDER BY r.tanggal ASC
        `);

        history.forEach(h => {
            console.log(`ID: ${h.id} | Date: ${moment(h.tanggal).format('YYYY-MM-DD')} | Status: ${h.status} | Ket: ${h.keterangan}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
