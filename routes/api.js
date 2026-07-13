const express = require('express');
const router = express.Router();
const Kas = require('../models/Kas');
const Ronda = require('../models/Ronda');
const Event = require('../models/Event');
const moment = require('moment');

// Simple API key verification middleware
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const expectedKey = process.env.WIDGET_API_KEY || 'warga_ambyar_widget_secret_key';
    
    if (!apiKey || apiKey !== expectedKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
    }
    next();
};

router.get('/widget-data', verifyApiKey, async (req, res) => {
    try {
        // ponytail: Keep db query calls minimal and clean
        // 1. Fetch Kas Balance
        const saldo = await Kas.getBalance();

        // 2. Fetch Ronda Schedule
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

        const formattedRonda = {
            is_upcoming: isUpcoming,
            tanggal: moment(scheduleDate).format('YYYY-MM-DD'),
            petugas: todaySchedule.map(p => p.nama)
        };

        // 3. Fetch Upcoming Events/Announcements
        const rawEvents = await Event.getUpcoming();
        const formattedEvents = rawEvents.map(e => ({
            id: e.id,
            judul: e.judul,
            deskripsi: e.keterangan,
            tanggal: moment(e.tanggal).format('YYYY-MM-DD HH:mm'),
            lokasi: e.lokasi
        }));

        res.json({
            success: true,
            data: {
                saldo_kas: saldo,
                jadwal_ronda: formattedRonda,
                pengumuman: formattedEvents
            }
        });
    } catch (err) {
        console.error('Error fetching widget data:', err);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

module.exports = router;
