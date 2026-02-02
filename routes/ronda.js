const express = require('express');
const router = express.Router();
const rondaController = require('../controllers/rondaController');
const { ensureAuthenticated, isAdminOrBendahara } = require('../middleware/auth');

// Export must be before other routes
router.get('/export-control', ensureAuthenticated, rondaController.exportControl);
router.get('/', ensureAuthenticated, rondaController.index);
router.get('/teams', ensureAuthenticated, rondaController.teams);
router.post('/teams/update', ensureAuthenticated, rondaController.updateTeam);
router.post('/manual-add', ensureAuthenticated, rondaController.addManualParticipant);
router.post('/update-status', ensureAuthenticated, rondaController.updateStatus);
router.post('/pay-fine', ensureAuthenticated, rondaController.payFine);
router.post('/pay-fine-upload', ensureAuthenticated, rondaController.submitFine);
router.post('/verify-fine', ensureAuthenticated, rondaController.verifyFine);
router.post('/upload-photos/:id', ensureAuthenticated, rondaController.uploadPhotos);
router.post('/upload-condition/:date', ensureAuthenticated, rondaController.uploadCondition);
router.post('/delete-photo', ensureAuthenticated, rondaController.deletePhoto);
router.post('/share-image', ensureAuthenticated, rondaController.uploadShareImage);
router.get('/control', ensureAuthenticated, rondaController.control);

router.post('/update-fine-status', ensureAuthenticated, rondaController.updateFineStatus);

// Regenerate January 2026 schedule
router.get('/regenerate-january', ensureAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
        const Ronda = require('../models/Ronda');
        
        let output = `<!DOCTYPE html><html><head><title>Regenerate Januari</title></head><body style="font-family: Arial; padding: 20px;">`;
        output += `<h2>🔄 Regenerate Jadwal Januari 2026</h2>`;
        
        if (req.query.confirm === 'yes') {
            // Hapus semua jadwal Januari
            const [deleteResult] = await db.query(
                "DELETE FROM ronda_jadwal WHERE tanggal BETWEEN '2026-01-01' AND '2026-01-31'"
            );
            
            output += `<p>🗑️  Dihapus ${deleteResult.affectedRows} jadwal lama</p>`;
            
            // Generate ulang
            await Ronda.generateSchedule('01', '2026');
            
            output += `<p style="color: green; font-weight: bold; font-size: 18px;">✅ Jadwal Januari 2026 berhasil di-regenerate!</p>`;
            output += `<p><a href="/ronda?month=1&year=2026" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Lihat Jadwal Januari</a></p>`;
        } else {
            output += `<p>⚠️  Ini akan menghapus SEMUA jadwal Januari 2026 dan generate ulang dengan rotasi tim yang benar.</p>`;
            output += `<p><strong>Rotasi yang benar:</strong></p>`;
            output += `<ul>`;
            output += `<li>03 Jan → Tim B</li>`;
            output += `<li>10 Jan → Tim C (Epoch)</li>`;
            output += `<li>17 Jan → Tim D</li>`;
            output += `<li>24 Jan → Tim A</li>`;
            output += `<li>31 Jan → Tim B</li>`;
            output += `</ul>`;
            output += `<p><a href="/ronda/regenerate-january?confirm=yes" style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">✓ Konfirmasi Regenerate</a>`;
            output += `<a href="/ronda" style="background: #9E9E9E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">✗ Batal</a></p>`;
        }
        
        output += `</body></html>`;
        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// Regenerate February 2026 schedule
router.get('/regenerate-february', ensureAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
        const Ronda = require('../models/Ronda');
        
        let output = `<!DOCTYPE html><html><head><title>Regenerate Februari</title></head><body style="font-family: Arial; padding: 20px;">`;
        output += `<h2>🔄 Regenerate Jadwal Februari 2026</h2>`;
        
        if (req.query.confirm === 'yes') {
            // Hapus semua jadwal Februari
            const [deleteResult] = await db.query(
                "DELETE FROM ronda_jadwal WHERE tanggal BETWEEN '2026-02-01' AND '2026-02-28'"
            );
            
            output += `<p>🗑️  Dihapus ${deleteResult.affectedRows} jadwal lama</p>`;
            
            // Generate ulang
            await Ronda.generateSchedule('02', '2026');
            
            output += `<p style="color: green; font-weight: bold; font-size: 18px;">✅ Jadwal Februari 2026 berhasil di-regenerate!</p>`;
            output += `<p><a href="/ronda?month=2&year=2026" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Lihat Jadwal Februari</a></p>`;
        } else {
            output += `<p>⚠️  Ini akan menghapus SEMUA jadwal Februari 2026 dan generate ulang dengan rotasi tim yang benar.</p>`;
            output += `<p><strong>Rotasi yang benar:</strong></p>`;
            output += `<ul>`;
            output += `<li>07 Feb → Tim C</li>`;
            output += `<li>14 Feb → Tim D</li>`;
            output += `<li>21 Feb → Tim A</li>`;
            output += `<li>28 Feb → Tim B</li>`;
            output += `</ul>`;
            output += `<p><a href="/ronda/regenerate-february?confirm=yes" style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">✓ Konfirmasi Regenerate</a>`;
            output += `<a href="/ronda" style="background: #9E9E9E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">✗ Batal</a></p>`;
        }
        
        output += `</body></html>`;
        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// Admin page for regenerating schedules
router.get('/admin-regenerate', ensureAuthenticated, async (req, res) => {
    try {
        const moment = require('moment');
        
        let output = `<!DOCTYPE html><html><head><title>Admin - Regenerate Jadwal</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
            .month-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 30px; }
            .month-card { background: #f9f9f9; border: 2px solid #ddd; border-radius: 8px; padding: 20px; transition: all 0.3s; }
            .month-card:hover { border-color: #4CAF50; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2); }
            .month-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .month-info { font-size: 12px; color: #666; margin-bottom: 15px; line-height: 1.6; }
            .btn { display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; cursor: pointer; border: none; font-size: 14px; }
            .btn-regenerate { background: #f44336; color: white; }
            .btn-regenerate:hover { background: #d32f2f; }
            .btn-view { background: #2196F3; color: white; margin-left: 5px; }
            .btn-view:hover { background: #1976D2; }
            .btn-back { background: #9E9E9E; color: white; }
            .btn-back:hover { background: #757575; }
            .alert { padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .alert-info { background: #E3F2FD; border-left: 4px solid #2196F3; color: #1976D2; }
        </style>
        </head><body>`;
        
        output += `<div class="container">`;
        output += `<h1>🔧 Admin - Regenerate Jadwal Ronda 2026</h1>`;
        output += `<div class="alert alert-info">⚠️ <strong>Perhatian:</strong> Regenerate akan menghapus SEMUA jadwal bulan tersebut dan membuat ulang dengan rotasi tim yang benar.</div>`;
        
        output += `<div class="month-grid">`;
        
        // Generate cards for each month in 2026
        const months = [
            { num: '01', name: 'Januari', saturdays: ['03', '10', '17', '24', '31'], teams: ['B', 'C', 'D', 'A', 'B'] },
            { num: '02', name: 'Februari', saturdays: ['07', '14', '21', '28'], teams: ['C', 'D', 'A', 'B'] },
            { num: '03', name: 'Maret', saturdays: ['07', '14', '21', '28'], teams: ['C', 'D', 'A', 'B'] },
            { num: '04', name: 'April', saturdays: ['04', '11', '18', '25'], teams: ['C', 'D', 'A', 'B'] },
            { num: '05', name: 'Mei', saturdays: ['02', '09', '16', '23', '30'], teams: ['C', 'D', 'A', 'B', 'C'] },
            { num: '06', name: 'Juni', saturdays: ['06', '13', '20', '27'], teams: ['D', 'A', 'B', 'C'] },
            { num: '07', name: 'Juli', saturdays: ['04', '11', '18', '25'], teams: ['D', 'A', 'B', 'C'] },
            { num: '08', name: 'Agustus', saturdays: ['01', '08', '15', '22', '29'], teams: ['D', 'A', 'B', 'C', 'D'] },
            { num: '09', name: 'September', saturdays: ['05', '12', '19', '26'], teams: ['A', 'B', 'C', 'D'] },
            { num: '10', name: 'Oktober', saturdays: ['03', '10', '17', '24', '31'], teams: ['A', 'B', 'C', 'D', 'A'] },
            { num: '11', name: 'November', saturdays: ['07', '14', '21', '28'], teams: ['B', 'C', 'D', 'A'] },
            { num: '12', name: 'Desember', saturdays: ['05', '12', '19', '26'], teams: ['B', 'C', 'D', 'A'] }
        ];
        
        months.forEach(month => {
            output += `<div class="month-card">`;
            output += `<div class="month-title">${month.name} 2026</div>`;
            output += `<div class="month-info">`;
            month.saturdays.forEach((day, idx) => {
                output += `${day} → Tim ${month.teams[idx]}<br>`;
            });
            output += `</div>`;
            output += `<a href="/ronda/regenerate-month?month=${month.num}&year=2026" class="btn btn-regenerate">🔄 Regenerate</a>`;
            output += `<a href="/ronda?month=${parseInt(month.num)}&year=2026" class="btn btn-view">👁️ Lihat</a>`;
            output += `</div>`;
        });
        
        output += `</div>`;
        output += `<div style="margin-top: 30px; text-align: center;">`;
        output += `<a href="/ronda" class="btn btn-back">← Kembali ke Ronda</a>`;
        output += `</div>`;
        output += `</div></body></html>`;
        
        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// Regenerate specific month
router.get('/regenerate-month', ensureAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
        const Ronda = require('../models/Ronda');
        const moment = require('moment');
        
        const { month, year } = req.query;
        
        if (!month || !year) {
            return res.redirect('/ronda/admin-regenerate');
        }
        
        const monthName = moment(`${year}-${month}-01`).format('MMMM YYYY');
        const startDate = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
        const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        
        let output = `<!DOCTYPE html><html><head><title>Regenerate ${monthName}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #333; }
            .btn { display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px; }
            .btn-confirm { background: #f44336; color: white; }
            .btn-cancel { background: #9E9E9E; color: white; }
            .btn-success { background: #4CAF50; color: white; }
            .success { color: green; font-weight: bold; font-size: 18px; }
        </style>
        </head><body><div class="container">`;
        
        output += `<h2>🔄 Regenerate Jadwal ${monthName}</h2>`;
        
        if (req.query.confirm === 'yes') {
            // Hapus jadwal bulan tersebut
            const [deleteResult] = await db.query(
                "DELETE FROM ronda_jadwal WHERE tanggal BETWEEN ? AND ?",
                [startDate, endDate]
            );
            
            output += `<p>🗑️  Dihapus ${deleteResult.affectedRows} jadwal lama</p>`;
            
            // Generate ulang
            await Ronda.generateSchedule(month, year);
            
            output += `<p class="success">✅ Jadwal ${monthName} berhasil di-regenerate!</p>`;
            output += `<a href="/ronda?month=${parseInt(month)}&year=${year}" class="btn btn-success">Lihat Jadwal</a>`;
            output += `<a href="/ronda/admin-regenerate" class="btn btn-cancel">Kembali</a>`;
        } else {
            output += `<p>⚠️  Ini akan menghapus SEMUA jadwal ${monthName} dan generate ulang dengan rotasi tim yang benar.</p>`;
            output += `<p><strong>Yakin ingin melanjutkan?</strong></p>`;
            output += `<a href="/ronda/regenerate-month?month=${month}&year=${year}&confirm=yes" class="btn btn-confirm">✓ Ya, Regenerate</a>`;
            output += `<a href="/ronda/admin-regenerate" class="btn btn-cancel">✗ Batal</a>`;
        }
        
        output += `</div></body></html>`;
        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

// Cleanup route for invalid schedules
router.get('/cleanup-schedules', ensureAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
        const moment = require('moment');
        
        // Query untuk menemukan jadwal yang akan dihapus
        const [toDelete] = await db.query(`
            SELECT 
                s.id,
                s.warga_id,
                w.nama,
                s.tanggal,
                s.status,
                h.tanggal as hadir_date
            FROM ronda_jadwal s
            INNER JOIN ronda_jadwal h ON s.warga_id = h.warga_id
            INNER JOIN warga w ON s.warga_id = w.id
            WHERE 
                s.status IN ('scheduled', 'reschedule')
                AND h.status = 'hadir'
                AND h.tanggal < s.tanggal
                AND h.tanggal >= DATE_SUB(s.tanggal, INTERVAL 4 WEEK)
                AND s.tanggal <= DATE_ADD(h.tanggal, INTERVAL 4 WEEK)
        `);

        let output = `<!DOCTYPE html><html><head><title>Cleanup Jadwal</title></head><body style="font-family: Arial; padding: 20px;">`;
        output += `<h2>🧹 Cleanup Jadwal Ronda</h2>`;
        output += `<p>Ditemukan <strong>${toDelete.length}</strong> jadwal yang akan dihapus:</p><ul>`;
        
        toDelete.forEach(row => {
            output += `<li><strong>${row.nama}</strong> (ID: ${row.warga_id}) - Tanggal: ${moment(row.tanggal).format('DD MMM YYYY')}, Status: <em>${row.status}</em><br>`;
            output += `<small>Alasan: Sudah hadir di ${moment(row.hadir_date).format('DD MMM YYYY')}</small></li>`;
        });
        output += `</ul>`;

        if (toDelete.length > 0 && req.query.confirm === 'yes') {
            // Hapus jadwal
            const ids = toDelete.map(r => r.id);
            await db.query('DELETE FROM ronda_jadwal WHERE id IN (?)', [ids]);
            output += `<p style="color: green; font-weight: bold; font-size: 18px;">✅ ${ids.length} jadwal berhasil dihapus!</p>`;
            output += `<p><a href="/ronda/control" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Kembali ke Control</a></p>`;
        } else if (toDelete.length > 0) {
            output += `<p><a href="/ronda/cleanup-schedules?confirm=yes" style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">✓ Konfirmasi Hapus</a>`;
            output += `<a href="/ronda/control" style="background: #9E9E9E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">✗ Batal</a></p>`;
        } else {
            output += `<p style="color: green; font-size: 18px;">✅ Tidak ada jadwal yang perlu dihapus.</p>`;
            output += `<p><a href="/ronda/control" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Kembali ke Control</a></p>`;
        }

        output += `</body></html>`;
        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

router.get('/view', rondaController.viewPublic);
router.get('/v/:id', rondaController.viewPublic);

module.exports = router;
