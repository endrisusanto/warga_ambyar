const db = require('./config/db');
const Ronda = require('./models/Ronda');
const moment = require('moment');

async function test() {
    try {
        console.log('Testing Ronda Controller queries...');
        const today = moment();
        const month = today.format('MM');
        const year = today.format('YYYY');

        await Ronda.generateSchedule(month, year);
        console.log('Generate OK');

        const schedule = await Ronda.getMonthlySchedule(month, year);
        console.log('Monthly Schedule OK, length:', schedule.length);

        const todaySchedule = await Ronda.getTodaySchedule();
        console.log('Today Schedule OK, length:', todaySchedule.length);

        const nextSchedule = await Ronda.getNextSchedule();
        console.log('Next Schedule OK, length:', Array.isArray(nextSchedule) ? nextSchedule.length : 1);

        const teams = await Ronda.getTeams();
        console.log('Teams OK, keys:', Object.keys(teams));

        const documentation = await Ronda.getDokumentasi(month, year);
        console.log('Documentation OK, length:', documentation.length);

        console.log('All queries passed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Error during test:', e);
        process.exit(1);
    }
}

test();
