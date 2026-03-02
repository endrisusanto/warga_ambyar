require('dotenv').config();
const db = require('./config/db');
const moment = require('moment');

async function reset() {
    console.log('Resetting Reschedules...');

    try {
        // 1. Revert 'reschedule' status to 'scheduled'
        await db.query("UPDATE ronda_jadwal SET status = 'scheduled', keterangan = NULL WHERE status = 'reschedule'");
        console.log("Reverted 'reschedule' statuses to 'scheduled'.");

        // 2. Delete "Guest" entries (Wrong Team Members)
        // Similar to fix_schedule.js strict mode
        const month = '01';
        const year = '2026';

        const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        const endDate = startDate.clone().endOf('month');
        const saturdays = [];
        let day = startDate.clone();
        while (day <= endDate) {
            if (day.day() === 6) saturdays.push(day.format('YYYY-MM-DD'));
            day.add(1, 'days');
        }

        const teamsList = ['A', 'B', 'C', 'D'];
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C

        for (const dateStr of saturdays) {
            const dateObj = moment(dateStr);
            const diffDays = dateObj.diff(epochDate, 'days');
            const diffWeeks = Math.round(diffDays / 7);

            let teamIndex = (epochIndex + diffWeeks) % 4;
            if (teamIndex < 0) teamIndex += 4;
            const correctTeam = teamsList[teamIndex];

            // Find entries for this date where w.tim_ronda != correctTeam
            const [wrongEntries] = await db.query(`
                SELECT r.id, w.nama, w.tim_ronda 
                FROM ronda_jadwal r 
                JOIN warga w ON r.warga_id = w.id 
                WHERE r.tanggal = ? AND w.tim_ronda != ? AND w.tim_ronda IS NOT NULL
             `, [dateStr, correctTeam]);

            if (wrongEntries.length > 0) {
                console.log(`Date ${dateStr} (Team ${correctTeam}): Found ${wrongEntries.length} guest entries to delete.`);
                const ids = wrongEntries.map(r => r.id);
                const placeholder = ids.map(() => '?').join(',');
                await db.query(`DELETE FROM ronda_jadwal WHERE id IN (${placeholder})`, ids);
                console.log('Deleted guest entries.');
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
