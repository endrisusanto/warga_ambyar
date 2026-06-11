const moment = require('moment');

const epochDate = moment('2026-01-10');
const epochIndex = 2; // C
const teamsList = ['A', 'B', 'C', 'D'];

const liburDates = [
    '2026-03-21',
    '2026-03-28',
    '2026-04-04'
];

const liburSet = new Set(liburDates);

// Generate Saturdays from Jan 10 2026 to June 27 2026
let current = moment('2026-01-10');
const end = moment('2026-06-27');

while (current <= end) {
    const dateStr = current.format('YYYY-MM-DD');
    const diffDays = current.diff(epochDate, 'days');
    const diffWeeks = Math.floor(diffDays / 7);
    const liburCountBefore = liburDates.filter(d => d < dateStr).length;

    let teamIndex = (epochIndex + diffWeeks - liburCountBefore) % 4;
    if (teamIndex < 0) teamIndex += 4;

    const isLibur = liburSet.has(dateStr);
    const team = isLibur ? 'LIBUR' : teamsList[teamIndex];

    console.log(`${dateStr}: Weeks=${diffWeeks}, LiburBefore=${liburCountBefore}, TeamIndex=${teamIndex} -> ${team}`);

    current.add(7, 'days');
}
