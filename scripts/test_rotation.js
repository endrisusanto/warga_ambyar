const moment = require('moment');

// Test rotasi tim untuk Januari 2026
const teamsList = ['A', 'B', 'C', 'D'];
const epochDate = moment('2026-01-10');
const epochIndex = 2; // C

const saturdays = [
    '2026-01-03',
    '2026-01-10', 
    '2026-01-17',
    '2026-01-24',
    '2026-01-31'
];

console.log('🧪 Testing Team Rotation Logic\n');
console.log(`Epoch: ${epochDate.format('DD MMM YYYY')} = Tim ${teamsList[epochIndex]}\n`);

saturdays.forEach(dateStr => {
    const dateObj = moment(dateStr);
    const diffDays = dateObj.diff(epochDate, 'days');
    
    // Test dengan Math.round
    const diffWeeksRound = Math.round(diffDays / 7);
    let teamIndexRound = (epochIndex + diffWeeksRound) % 4;
    if (teamIndexRound < 0) teamIndexRound += 4;
    
    // Test dengan Math.floor
    const diffWeeksFloor = Math.floor(diffDays / 7);
    let teamIndexFloor = (epochIndex + diffWeeksFloor) % 4;
    if (teamIndexFloor < 0) teamIndexFloor += 4;
    
    console.log(`${dateObj.format('DD MMM YYYY')}:`);
    console.log(`  diffDays: ${diffDays}`);
    console.log(`  Math.round(${diffDays}/7) = ${diffWeeksRound} → Tim ${teamsList[teamIndexRound]}`);
    console.log(`  Math.floor(${diffDays}/7) = ${diffWeeksFloor} → Tim ${teamsList[teamIndexFloor]}`);
    console.log('');
});

console.log('\n📊 Expected Rotation:');
console.log('03 Jan → Tim B');
console.log('10 Jan → Tim C (Epoch)');
console.log('17 Jan → Tim D');
console.log('24 Jan → Tim A');
console.log('31 Jan → Tim B');
