const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const moment = require('moment');

// Import models
const Kas = require('../models/Kas');
const Ronda = require('../models/Ronda');
const Event = require('../models/Event');
const User = require('../models/User');
const Pengaduan = require('../models/Pengaduan');

// Simple API key verification middleware
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const expectedKey = process.env.WIDGET_API_KEY || 'warga_ambyar_widget_secret_key';
    
    if (!apiKey || apiKey !== expectedKey) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
    }
    next();
};

// 1. Auth Endpoint: POST /api/auth/login
router.post('/auth/login', verifyApiKey, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    try {
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect password' });
        }
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                username: user.username,
                role: user.role,
                warga_id: user.warga_id
            }
        });
    } catch (err) {
        console.error('API Login Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 2. Summary Widget: GET /api/widget-data
router.get('/widget-data', verifyApiKey, async (req, res) => {
    try {
        const saldo = await Kas.getBalance();

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
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 3. Keuangan (Kas): GET /api/keuangan
router.get('/keuangan', verifyApiKey, async (req, res) => {
    try {
        const history = await Kas.getAll();
        const saldo = await Kas.getBalance();
        const summary = await Kas.getSummary();
        
        res.json({
            success: true,
            data: {
                saldo: saldo,
                pemasukan: summary.pemasukan || 0,
                pengeluaran: summary.pengeluaran || 0,
                transaksi: history.map(t => ({
                    id: t.id,
                    tipe: t.tipe,
                    jumlah: t.jumlah,
                    keterangan: t.keterangan,
                    tanggal: moment(t.tanggal).format('YYYY-MM-DD'),
                    bukti_foto: t.bukti_foto
                }))
            }
        });
    } catch (err) {
        console.error('API Keuangan Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 4. Ronda: GET /api/ronda
router.get('/ronda', verifyApiKey, async (req, res) => {
    try {
        const now = moment();
        const schedule = await Ronda.getMonthlySchedule(now.format('MM'), now.format('YYYY'));
        const todaySchedule = await Ronda.getTodaySchedule();
        
        res.json({
            success: true,
            data: {
                ronda_hari_ini: todaySchedule.map(p => ({
                    id: p.id,
                    warga_id: p.warga_id,
                    nama: p.nama,
                    blok: p.blok,
                    nomor_rumah: p.nomor_rumah,
                    status: p.status
                })),
                jadwal_bulanan: schedule.map(s => ({
                    id: s.id,
                    tanggal: moment(s.tanggal).format('YYYY-MM-DD'),
                    warga_id: s.warga_id,
                    nama: s.nama,
                    blok: s.blok,
                    nomor_rumah: s.nomor_rumah,
                    status: s.status
                }))
            }
        });
    } catch (err) {
        console.error('API Ronda Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 5. CCTV Streams: GET /api/cctv
router.get('/cctv', verifyApiKey, async (req, res) => {
    try {
        // Frigate CCTV local streams config
        const localCameras = [
            { id: 'CCTV-GANG-1', name: 'Ujung Selatan', url: 'https://camera.ambyar.biz.id/api/frame.jpeg?src=cctv_gang_ambyar' },
            { id: 'KALULA-HOME', name: 'CCTV Kalula Home', url: 'https://camera.ambyar.biz.id/api/frame.jpeg?src=cctv_kalula' },
            { id: 'CCTV-GANG-2', name: 'Ujung Utara & Tengah', url: 'https://camera.ambyar.biz.id/api/frame.jpeg?src=security_camera' }
        ];

        // Public traffic HLS cameras (ex. PU Binamarga)
        const publicCameras = [
            { id: 'CT-01', name: 'Tambun Selatan (Showroom MG)', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-01/index.m3u8' },
            { id: 'CT-02', name: 'RSUD Kab Bekasi (Cibitung)', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-02/index.m3u8' },
            { id: 'CT-03', name: 'Stasiun Lemah Abang', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-03/index.m3u8' },
            { id: 'CT-04', name: 'U-Turn Besar Perum BCL', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-04/index.m3u8' },
            { id: 'CT-05', name: 'Pintu Kereta Citarik (Michelin)', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-05/index.m3u8' },
            { id: 'CT-06', name: 'KPU Kab Bekasi', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-06/index.m3u8' },
            { id: 'CT-07', name: 'RS DKH Kedungwaringin', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-07/index.m3u8' },
            { id: 'CT-08', name: 'Jalan Lingkar Karawang (Hadap Cikarang)', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-08/index.m3u8' },
            { id: 'CT-09', name: 'Pintu TOL Klari', url: 'https://its.binamarga.pu.go.id:8989/play/hls/CT-09/index.m3u8' }
        ];

        res.json({
            success: true,
            data: {
                cctv_lokal: localCameras,
                cctv_lalu_lintas: publicCameras
            }
        });
    } catch (err) {
        console.error('API CCTV Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 6. Pengaduan: GET /api/pengaduan & POST /api/pengaduan
router.get('/pengaduan', verifyApiKey, async (req, res) => {
    try {
        const complaints = await Pengaduan.getAll();
        res.json({
            success: true,
            data: complaints.map(c => ({
                id: c.id,
                judul: c.judul,
                deskripsi: c.deskripsi,
                status: c.status,
                tanggapan: c.tanggapan,
                nama_warga: c.nama_warga,
                blok: c.blok,
                nomor_rumah: c.nomor_rumah,
                is_anonim: c.is_anonim,
                created_at: moment(c.created_at).format('YYYY-MM-DD HH:mm')
            }))
        });
    } catch (err) {
        console.error('API Pengaduan Get Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/pengaduan', verifyApiKey, async (req, res) => {
    const { warga_id, judul, deskripsi, is_anonim } = req.body;
    if (!warga_id || !judul || !deskripsi) {
        return res.status(400).json({ success: false, message: 'Warga ID, judul, and deskripsi are required' });
    }
    
    try {
        const complaintId = await Pengaduan.create({
            warga_id: parseInt(warga_id),
            judul,
            deskripsi,
            foto: null,
            is_anonim: is_anonim === true || is_anonim === 1
        });
        
        res.json({
            success: true,
            message: 'Pengaduan berhasil dikirim',
            data: { id: complaintId }
        });
    } catch (err) {
        console.error('API Pengaduan Post Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
