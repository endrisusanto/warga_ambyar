const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

const SIREN_ENTITY_ID = 'siren.camera_gcc2_f7f8_siren';
const HIDDEN_CAMERAS_FILE = path.join(__dirname, '..', 'data', 'cctv-hidden-cameras.json');

async function readHiddenCameras() {
    try {
        const raw = await fs.readFile(HIDDEN_CAMERAS_FILE, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data.hiddenCameras) ? data.hiddenCameras : [];
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Read hidden CCTV cameras error:', error);
        }
        return [];
    }
}

async function writeHiddenCameras(hiddenCameras) {
    await fs.mkdir(path.dirname(HIDDEN_CAMERAS_FILE), { recursive: true });
    await fs.writeFile(
        HIDDEN_CAMERAS_FILE,
        `${JSON.stringify({ hiddenCameras }, null, 2)}\n`,
        'utf8'
    );
}

// CCTV monitor is public, no auth required
router.get('/monitor', async (req, res) => {
    const hiddenCameras = await readHiddenCameras();
    res.render('cctv/monitor', {
        title: 'Monitor CCTV',
        hiddenCameras
    });
});

router.post('/hide-camera', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Hanya admin yang dapat menyembunyikan kamera.'
            });
        }

        const cameraId = String(req.body.camera_id || '').trim();
        const hidden = req.body.hidden === true || req.body.hidden === 'true';

        if (!cameraId) {
            return res.status(400).json({
                success: false,
                message: 'camera_id wajib diisi.'
            });
        }

        const hiddenSet = new Set(await readHiddenCameras());
        if (hidden) {
            hiddenSet.add(cameraId);
        } else {
            hiddenSet.delete(cameraId);
        }

        const hiddenCameras = [...hiddenSet].sort();
        await writeHiddenCameras(hiddenCameras);

        res.json({
            success: true,
            hidden,
            hiddenCameras,
            message: hidden ? 'Kamera disembunyikan.' : 'Kamera ditampilkan kembali.'
        });
    } catch (error) {
        console.error('Hide CCTV camera error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan status kamera.'
        });
    }
});

router.post('/siren', ensureAuthenticated, async (req, res) => {
    try {
        const baseUrl = process.env.HOME_ASSISTANT_URL || process.env.HASS_URL;
        const token = process.env.HOME_ASSISTANT_TOKEN || process.env.HASS_TOKEN;

        if (!baseUrl || !token) {
            return res.status(500).json({
                success: false,
                message: 'Konfigurasi Home Assistant belum lengkap.'
            });
        }

        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/services/siren/turn_on`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entity_id: SIREN_ENTITY_ID })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                success: false,
                message: errorText || 'Gagal menyalakan siren.'
            });
        }

        res.json({ success: true, message: 'Siren CCTV Gang dinyalakan.' });
    } catch (error) {
        console.error('CCTV siren error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghubungi Home Assistant.'
        });
    }
});

module.exports = router;
