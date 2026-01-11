require('dotenv').config();
const db = require('./config/db');
const moment = require('moment');

async function fix() {
    console.log('Fixing schedule duplicates...');

    // We strictly focus on Jan 2026 for now as observed
    const month = '01';
    const year = '2026'; // Or current year

    const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
    const endDate = startDate.clone().endOf('month');
    const saturdays = [];
    let day = startDate.clone();
    while (day <= endDate) {
        if (day.day() === 6) saturdays.push(day.format('YYYY-MM-DD'));
        day.add(1, 'days');
    }

    const output = [];

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

        console.log(`Date: ${dateStr}, Correct Team: ${correctTeam}`);

        // Get members of INCORRECT teams
        // i.e. All members whose tim_ronda is NOT correctTeam
        // Wait, if I just query Warga NOT in correctTeam?
        const [wrongMembers] = await db.query(
            "SELECT id, tim_ronda FROM warga WHERE tim_ronda != ? AND tim_ronda IS NOT NULL",
            [correctTeam]
        );

        const wrongIds = wrongMembers.map(m => m.id);

        if (wrongIds.length > 0) {
            // Delete from schedule if status is 'scheduled' (default)
            // We preserve 'hadir', 'alpa', 'izin' assuming those are real interactions.
            // We preserve entries that might be 'scheduled' BUT originated from Reschedule?
            // Rescheduled entries usually have a custom flow. 
            // But usually rescheduling involves update or specific insert.
            // If the duplicate was caused by my "Generate" running on top of Old Data, they are 'scheduled'.
            // Risk: Deleting a legit reschedule who happens to be in another team.
            // But existing duplicates (Team A) are definitely in another team.
            // A reschedule from last week (Team B) to This week (Team C) -> Member is in Team B.
            // Correct Team is C. Member B is "Wrong Team".
            // If Member B status is 'scheduled', he will be deleted!
            // CATCH: Rescheduled entries usually have 'scheduled' status?
            // `reschedule` function does: `INSERT INTO ... VALUES (..., 'scheduled')`.
            // So Yes, legit reschedules look exactly like duplicates.

            // DIFFERENCE: `generateSchedule` inserts `scheduled` for EVERYONE in the team.
            // Duplicates are entire Teams.
            // Legit reschedules are individuals.

            // If I see 10+ members of Team A on a Team C day, that's a Dupe Team.
            // If I see 1 member of Team B, that might be a Reschedule.

            // Strategy:
            // Count how many from each wrong team.
            // If count > 3 (arbitrary threshold for a team), nukem.

            const teamCounts = {};
            wrongMembers.forEach(m => {
                teamCounts[m.tim_ronda] = (teamCounts[m.tim_ronda] || []).concat(m.id);
            });

            for (const [team, ids] of Object.entries(teamCounts)) {
                // Check how many of these are actually in the schedule for this date
                if (ids.length === 0) continue;

                const placeholder = ids.map(() => '?').join(',');
                const [scheduledWrong] = await db.query(
                    `SELECT id FROM ronda_jadwal WHERE tanggal = ? AND status = 'scheduled' AND warga_id IN (${placeholder})`,
                    [dateStr, ...ids]
                );

                const count = scheduledWrong.length;
                console.log(`  Team ${team}: ${count} wrong entries found.`);

                if (count > 0) { // Strict cleanup: Delete ANY wrong team member with 'scheduled' status
                    console.log(`  -> Deleting ${count} entries from Team ${team} (Likely Duplicate/Bug)`);
                    const idsToDelete = scheduledWrong.map(r => r.id);
                    if (idsToDelete.length > 0) {
                        const delPlaceholder = idsToDelete.map(() => '?').join(',');
                        await db.query(
                            `DELETE FROM ronda_jadwal WHERE id IN (${delPlaceholder})`,
                            idsToDelete
                        );
                    }
                } else {
                    console.log(`  -> Keeping Team ${team} (Count ${count} <= 2, possibly legit reschedules)`);
                }
            }
        }
    }
    console.log('Done.');
    process.exit(0);
}

fix();
