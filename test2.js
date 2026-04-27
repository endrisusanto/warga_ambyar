const moment = require('moment');
const db = require('./config/db');
const Ronda = require('./models/Ronda');

async function test() {
    const month = '04';
    const year = '2026';
    const mDate = moment('2026-04-25');
    
    const schedule = await Ronda.getMonthlySchedule(month, year);
    const daySchedule = schedule.filter(s => moment(s.tanggal).isSame(mDate, 'day'));
    
    console.log("Day schedule count:", daySchedule.length);
    daySchedule.forEach(s => {
        if (s.foto_bukti) {
            console.log("Found foto_bukti:", s.foto_bukti, "for user", s.nama);
        }
    });

    const docs = await Ronda.getDokumentasi(month, year);
    const dayDocs = docs.filter(d => moment(d.tanggal).isSame(mDate, 'day'));
    console.log("Day docs count:", dayDocs.length);
    dayDocs.forEach(d => {
        if (d.foto) console.log("Found doc foto:", d.foto);
    });

    process.exit();
}
test();
