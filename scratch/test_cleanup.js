require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("Simulating database cleanup for May and June 2026...");
        const [rows] = await db.query(`
            SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal BETWEEN '2026-05-01' AND '2026-06-30'
            ORDER BY r.tanggal ASC, r.id ASC
        `);

        let toDelete = [];
        let toKeep = [];

        rows.forEach(r => {
            const ket = r.keterangan || '';
            const shouldDelete = r.status === 'scheduled' || 
                                 r.status === 'reschedule' || 
                                 ket.includes('Auto Reschedule') || 
                                 ket.includes('Otomatis Denda') ||
                                 ket.includes('Reschedule ke') ||
                                 ket.includes('Reschedule dari');
            
            if (shouldDelete) {
                toDelete.push(r);
            } else {
                toKeep.push(r);
            }
        });

        console.log(`\n--- TO DELETE (${toDelete.length} rows) ---`);
        toDelete.forEach(r => {
            console.log(`ID: ${r.id} | Date: ${moment(r.tanggal).format('YYYY-MM-DD')} | Warga: ${r.nama} (Team: ${r.tim_ronda}) | Status: ${r.status} | Ket: ${r.keterangan}`);
        });

        console.log(`\n--- TO KEEP (${toKeep.length} rows) ---`);
        toKeep.forEach(r => {
            console.log(`ID: ${r.id} | Date: ${moment(r.tanggal).format('YYYY-MM-DD')} | Warga: ${r.nama} (Team: ${r.tim_ronda}) | Status: ${r.status} | Ket: ${r.keterangan}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
