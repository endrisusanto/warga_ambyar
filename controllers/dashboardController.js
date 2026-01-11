const Kas = require('../models/Kas');
const Warga = require('../models/Warga');
const Iuran = require('../models/Iuran');
const Ronda = require('../models/Ronda');

exports.index = async (req, res) => {
    console.log('===== DASHBOARD INDEX CALLED =====');
    const data = {
        title: 'Dashboard',
        saldo: 0,
        summary: { pemasukan: 0, pengeluaran: 0 },
        mapData: [],
        jadwalRonda: [],
        events: [],
        chartData: { labels: [], pemasukan: [], pengeluaran: [] },
        user: req.session.user
    };

    try {
        // 1. Kas Data
        try {
            data.saldo = await Kas.getBalance();
            data.summary = await Kas.getSummary();
            const trend = await Kas.getMonthlyTrend();
            data.chartData.labels = trend.map(t => t.bulan).reverse();
            data.chartData.pemasukan = trend.map(t => t.pemasukan).reverse();
            data.chartData.pengeluaran = trend.map(t => t.pengeluaran).reverse();
        } catch (e) {
            console.error('Error fetching Kas data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Kas: ${e.message}\n`);
        }

        // 2. Map Data
        try {
            // Map Data Preparation
            const allWarga = await Warga.getAll();
            // console.log('DEBUG: allWarga count:', allWarga.length); // Removed debug log
            // console.log('DEBUG: allWarga sample:', allWarga.slice(0, 2)); // Removed debug log
            // require('fs').appendFileSync('debug.log', `DEBUG: allWarga count: ${allWarga.length}\n`); // Removed debug log

            // Group by house
            const houses = {};
            allWarga.forEach(w => {
                const blok = w.blok ? w.blok.toString().trim().toUpperCase() : '';
                const nomor = w.nomor_rumah ? w.nomor_rumah.toString().trim() : '';
                const key = `${blok}-${nomor}`;

                if (!houses[key]) {
                    houses[key] = {
                        blok: blok,
                        nomor_rumah: nomor,
                        residents: [],
                        head: null
                    };
                }
                houses[key].residents.push(w);
                if (w.status_keluarga === 'Kepala Keluarga') {
                    houses[key].head = w;
                }
            });

            // Process each house
            for (const key in houses) {
                const house = houses[key];
                const head = house.head || house.residents[0]; // Fallback if no head defined

                // Determine status iuran
                let status_iuran = 'lunas';
                let unpaid_details = [];
                const iuranTarget = house.head || (house.residents.length > 0 ? house.residents[0] : null);
                if (iuranTarget) {
                    try {
                        status_iuran = await Iuran.getStatusByHouse(iuranTarget.id);
                        if (status_iuran === 'menunggak') {
                            unpaid_details = await Iuran.getUnpaidDetails(iuranTarget.id);
                        }
                    } catch (e) {
                        console.error(`Error fetching Iuran for ${key}:`, e.message);
                        require('fs').appendFileSync('debug.log', `ERROR Iuran for ${key}: ${e.message}\n`);
                    }
                }

                // Determine status huni
                // If residents exist, check status_huni of head, or default to 'Isi'
                // If no residents (shouldn't happen with getAll unless empty houses are stored in warga? No, usually empty houses are not in warga table unless we have a House model. 
                // But the prompt implies showing "Rumah Kosong". 
                // If the house is not in Warga table, we won't see it here.
                // However, the map loop in EJS iterates 1-20. So we need to handle "not found" in EJS as "Kosong".
                // Here we just prepare data for occupied houses.

                data.mapData.push({
                    blok: house.blok ? house.blok.toUpperCase() : '',
                    nomor_rumah: house.nomor_rumah,
                    residents: house.residents,
                    head_name: head ? head.nama : 'Unknown',
                    status_huni: (head ? head.status_huni : (house.residents.length > 0 ? house.residents[0].status_huni : 'kosong')).toLowerCase(),
                    status_iuran: status_iuran,
                    unpaid_details: unpaid_details
                });
            }


            console.log('MapData count:', data.mapData.length);
            console.log('Sample mapData:', data.mapData.slice(0, 3));
        } catch (e) {
            console.error('Error fetching Map data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Map: ${e.message}\n`);
        }

        // 3. Ronda Schedule
        try {
            // Ronda Schedule - get today's schedule or next
            let todaySchedule = await Ronda.getTodaySchedule();
            let isUpcoming = false;
            let scheduleDate = new Date();

            if (todaySchedule.length === 0) {
                todaySchedule = await Ronda.getNextSchedule();
                if (todaySchedule.length > 0) {
                    isUpcoming = true;
                    scheduleDate = new Date(todaySchedule[0].tanggal);
                }
            }

            // Format for display - group by day
            if (todaySchedule.length > 0) {
                const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const monthsMap = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                const dayName = daysMap[scheduleDate.getDay()];
                const dateStr = `${scheduleDate.getDate()} ${monthsMap[scheduleDate.getMonth()]}`;

                data.jadwalRonda.push({
                    day: isUpcoming ? `${dayName}, ${dateStr} (Akan Datang)` : 'Malam Ini',
                    petugas: todaySchedule
                });
            }
        } catch (e) {
            console.error('Error fetching Ronda data:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Ronda: ${e.message}\n`);
        }

        // 4. Events
        try {
            const Event = require('../models/Event');
            data.events = await Event.getUpcoming();
        } catch (e) {
            console.error('Error fetching Events:', e.message);
            require('fs').appendFileSync('debug.log', `ERROR Events: ${e.message}\n`);
        }

        res.render('dashboard/index', data);
    } catch (err) {
        console.error('CRITICAL_DASHBOARD_ERROR:', err);
        require('fs').appendFileSync('debug.log', `CRITICAL ERROR: ${err.message}\n${err.stack}\n`);
        res.render('dashboard/index', data);
    }
};

exports.addEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { title, description, date, location } = req.body;
        await Event.create({ title, description, date, location });
        req.flash('success_msg', 'Event berhasil ditambahkan');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menambahkan event');
        res.redirect('/dashboard');
    }
};

exports.editEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { id } = req.params;
        const { title, description, date, location } = req.body;
        await Event.update(id, { title, description, date, location });
        req.flash('success_msg', 'Event berhasil diperbarui');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memperbarui event');
        res.redirect('/dashboard');
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const Event = require('../models/Event');
        const { id } = req.params;
        await Event.delete(id);
        req.flash('success_msg', 'Event berhasil dihapus');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menghapus event');
        res.redirect('/dashboard');
    }
};
