const cron = require('node-cron');
const Iuran = require('./models/Iuran');
const Ronda = require('./models/Ronda');
const moment = require('moment');

// Generate bills on 1st of every month at 00:01
cron.schedule('1 0 1 * *', async () => {
    console.log('Running monthly bill generation...');
    const currentMonth = moment().startOf('month').format('YYYY-MM-DD');
    await Iuran.generateBillsForMonth(currentMonth);
});

// Rotate Ronda schedule every Monday at 00:01
cron.schedule('1 0 * * 1', async () => {
    console.log('Rotating Ronda schedule...');
    await Ronda.incrementOffset();
});
