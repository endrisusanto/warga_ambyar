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

const activeTimers = {};

router.post('/siren', async (req, res) => {
    try {
        const baseUrl = process.env.HOME_ASSISTANT_URL || process.env.HASS_URL;
        const token = process.env.HOME_ASSISTANT_TOKEN || process.env.HASS_TOKEN;

        if (!baseUrl || !token) {
            return res.status(500).json({
                success: false,
                message: 'Konfigurasi Home Assistant belum lengkap.'
            });
        }

        const duration = Math.min(Math.max(parseInt(req.body.duration) || 5, 1), 120); // Limit between 1 and 120 seconds
        
        let entities = [];
        if (Array.isArray(req.body.entities)) {
            entities = req.body.entities;
        } else {
            // Legacy / singular parameters support
            const triggerSiren = req.body.trigger_siren !== false && req.body.trigger_siren !== 'false';
            const triggerLight = req.body.trigger_light === true || req.body.trigger_light === 'true';
            const sirenEntityId = req.body.siren_entity || 'siren.security_camera';
            const lightEntityId = req.body.light_entity || 'light.security_camera_floodlight';
            
            if (triggerSiren) entities.push(sirenEntityId);
            if (triggerLight) entities.push(lightEntityId);
        }

        const hassHeaders = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Trigger and set timers for each selected entity
        for (const entityId of entities) {
            const domain = entityId.split('.')[0];
            if (!['siren', 'light', 'switch'].includes(domain)) {
                console.warn(`[Alarm] Unsupported domain for entity: ${entityId}`);
                continue;
            }

            // Clear existing timeout for this entity if already running
            if (activeTimers[entityId]) {
                clearTimeout(activeTimers[entityId]);
                delete activeTimers[entityId];
                console.log(`[Alarm] Cleared existing timer for: ${entityId}`);
            }

            // Trigger turn_on
            console.log(`[Alarm] Activating: ${entityId}`);
            try {
                const resTurnOn = await fetch(`${baseUrl.replace(/\/$/, '')}/api/services/${domain}/turn_on`, {
                    method: 'POST',
                    headers: hassHeaders,
                    body: JSON.stringify({ entity_id: entityId })
                });
                if (!resTurnOn.ok) {
                    const errorText = await resTurnOn.text();
                    console.error(`Failed to turn on ${entityId}:`, errorText);
                }
            } catch (e) {
                console.error(`Error turning on ${entityId}:`, e);
            }

            // Set timeout to turn off
            const timerId = setTimeout(async () => {
                console.log(`[Alarm] Automatically turning off: ${entityId}`);
                try {
                    await fetch(`${baseUrl.replace(/\/$/, '')}/api/services/${domain}/turn_off`, {
                        method: 'POST',
                        headers: hassHeaders,
                        body: JSON.stringify({ entity_id: entityId })
                    });
                } catch (e) {
                    console.error(`Error turning off ${entityId}:`, e);
                }
                delete activeTimers[entityId];
            }, duration * 1000);

            activeTimers[entityId] = timerId;
        }

        res.json({
            success: true,
            message: `Alarm diaktifkan selama ${duration} detik.`,
            duration,
            entities
        });
    } catch (error) {
        console.error('CCTV siren error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghubungi Home Assistant.'
        });
    }
});

module.exports = router;
