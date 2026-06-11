require('dotenv').config();
const db = require('../config/db');
const Ronda = require('../models/Ronda');
const moment = require('moment');

async function run() {
    try {
        console.log("Starting database cleanup for May and June 2026...");
        
        // 1. Fetch all rows in May and June to identify target IDs for deletion
        const [rows] = await db.query(`
            SELECT r.id, r.tanggal, r.status, r.keterangan, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal BETWEEN '2026-05-01' AND '2026-06-30'
        `);

        const idsToDelete = [];
        rows.forEach(r => {
            const ket = r.keterangan || '';
            const shouldDelete = r.status === 'scheduled' || 
                                 r.status === 'reschedule' || 
                                 ket.includes('Auto Reschedule') || 
                                 ket.includes('Otomatis Denda') ||
                                 ket.includes('Reschedule ke') ||
                                 ket.includes('Reschedule dari');
            
            if (shouldDelete) {
                idsToDelete.push(r.id);
            }
        });

        console.log(`Found ${idsToDelete.length} rows to delete.`);

        if (idsToDelete.length > 0) {
            // Delete these rows
            await db.query(`DELETE FROM ronda_jadwal WHERE id IN (?)`, [idsToDelete]);
            console.log("Successfully deleted duplicate/incorrect reschedule rows.");
        }

        // 2. Regenerate schedules for May and June cleanly (with allowPast = true)
        console.log("Regenerating schedule for May 2026...");
        await Ronda.generateSchedule('05', '2026', true);

        console.log("Regenerating schedule for June 2026...");
        await Ronda.generateSchedule('06', '2026', true);

        console.log("Cleanup and regeneration finished successfully!");

        // 3. Verify final state
        console.log("\n--- Verification of Final Database State ---");
        const [finalRows] = await db.query(`
            SELECT r.id, r.tanggal, r.status, r.keterangan, w.nama, w.tim_ronda
            FROM ronda_jadwal r
            LEFT JOIN warga w ON r.warga_id = w.id
            WHERE r.tanggal BETWEEN '2026-05-01' AND '2026-06-30'
            ORDER BY r.tanggal ASC, w.tim_ronda ASC, r.id ASC
        `);

        const scheduleByDate = {};
        finalRows.forEach(r => {
            const dateStr = moment(r.tanggal).format('YYYY-MM-DD');
            if (!scheduleByDate[dateStr]) {
                scheduleByDate[dateStr] = [];
            }
            scheduleByDate[dateStr].push(r);
        });

        for (const [dateStr, members] of Object.entries(scheduleByDate)) {
            const teamsPresent = [...new Set(members.map(m => m.tim_ronda).filter(Boolean))].sort();
            console.log(`\nDate: ${dateStr} (${moment(dateStr).format('dddd')})`);
            console.log(`Teams scheduled: ${teamsPresent.join(', ')}`);
            members.forEach(m => {
                console.log(`  - ${m.nama} (Team: ${m.tim_ronda}, Status: ${m.status}, Ket: ${m.keterangan})`);
            });
        }

    } catch (err) {
        console.error("Error running cleanup script:", err);
    } finally {
        process.exit(0);
    }
}

run();
