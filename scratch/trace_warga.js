require('dotenv').config();
const db = require('../config/db');
const moment = require('moment');

async function run() {
    try {
        console.log("Checking Team D members in 'warga':");
        const [wargas] = await db.query("SELECT id, nama, tim_ronda FROM warga WHERE tim_ronda = 'D'");
        wargas.forEach(w => {
            console.log(`Warga ID: ${w.id} | Nama: ${w.nama} | Team: ${w.tim_ronda}`);
        });

        const ids = wargas.map(w => w.id);
        if (ids.length > 0) {
            console.log("\nSchedule history for Team D members in 2026:");
            const [history] = await db.query(`
                SELECT r.id, r.tanggal, r.warga_id, r.status, r.keterangan, w.nama
                FROM ronda_jadwal r
                LEFT JOIN warga w ON r.warga_id = w.id
                WHERE r.warga_id IN (?) AND r.tanggal >= '2026-01-01'
                ORDER BY r.warga_id ASC, r.tanggal ASC
            `, [ids]);

            let currentWargaId = null;
            history.forEach(h => {
                if (h.warga_id !== currentWargaId) {
                    console.log(`\n--- ${h.nama} (ID: ${h.warga_id}) ---`);
                    currentWargaId = h.warga_id;
                }
                console.log(`  ID: ${h.id} | Date: ${moment(h.tanggal).format('YYYY-MM-DD')} | Status: ${h.status} | Ket: ${h.keterangan}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
