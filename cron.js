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

// Reset go2rtc security_camera stream every minute to clear zombie connections
cron.schedule('*/1 * * * *', async () => {
    try {
        const res = await fetch('https://camera.ambyar.biz.id/api/streams?delete=security_camera', {
            method: 'DELETE'
        });
        if (res.ok) {
            console.log('[Cron] Successfully reset go2rtc security_camera stream.');
        } else {
            console.error('[Cron] Failed to reset go2rtc security_camera stream:', res.status);
        }
    } catch (err) {
        console.error('[Cron] Error resetting go2rtc security_camera stream:', err);
    }
});
