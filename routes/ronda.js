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
router.post('/create-share', ensureAuthenticated, rondaController.createShare);
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
        const db = require('../config/db');
        
        // Get year from query or default to current year
        const selectedYear = req.query.year ? parseInt(req.query.year) : moment().year();
        
        // Get all Saturdays in the selected year
        const saturdays = [];
        const startOfYear = moment(`${selectedYear}-01-01`);
        const endOfYear = moment(`${selectedYear}-12-31`);
        
        let currentDate = startOfYear.clone();
        while (currentDate <= endOfYear) {
            if (currentDate.day() === 6) { // Saturday
                // Calculate team based on epoch (Jan 10 2026 = Tim C)
                const epochDate = moment('2026-01-10');
                const epochIndex = 2; // C
                const teamsList = ['A', 'B', 'C', 'D'];
                
                const diffDays = currentDate.diff(epochDate, 'days');
                const diffWeeks = Math.floor(diffDays / 7);
                let teamIndex = (epochIndex + diffWeeks) % 4;
                if (teamIndex < 0) teamIndex += 4;
                const team = teamsList[teamIndex];
                
                saturdays.push({
                    date: currentDate.format('YYYY-MM-DD'),
                    displayDate: currentDate.format('DD MMM YYYY'),
                    team: team
                });
            }
            currentDate.add(1, 'days');
        }
        
        // Check which weeks already have schedules
        const [existingSchedules] = await db.query(
            `SELECT DISTINCT tanggal FROM ronda_jadwal WHERE YEAR(tanggal) = ? ORDER BY tanggal`,
            [selectedYear]
        );
        const existingDates = new Set(existingSchedules.map(s => moment(s.tanggal).format('YYYY-MM-DD')));
        
        let output = `<!DOCTYPE html><html><head><title>Admin - Regenerate Jadwal</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
            .year-selector { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .year-selector label { font-weight: bold; margin-right: 10px; }
            .year-selector select { padding: 8px 15px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px; }
            .week-list { margin-top: 30px; }
            .week-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 10px; background: #f9f9f9; border: 2px solid #ddd; border-radius: 8px; transition: all 0.3s; }
            .week-item:hover { border-color: #4CAF50; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2); }
            .week-item.has-schedule { background: #E8F5E9; border-color: #4CAF50; }
            .week-info { flex: 1; }
            .week-date { font-size: 16px; font-weight: bold; color: #333; }
            .week-team { font-size: 14px; color: #666; margin-top: 5px; }
            .week-status { font-size: 12px; color: #4CAF50; margin-top: 5px; }
            .week-actions { display: flex; gap: 10px; }
            .btn { display: inline-block; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; cursor: pointer; border: none; font-size: 14px; }
            .btn-regenerate { background: #f44336; color: white; }
            .btn-regenerate:hover { background: #d32f2f; }
            .btn-view { background: #2196F3; color: white; }
            .btn-view:hover { background: #1976D2; }
            .btn-back { background: #9E9E9E; color: white; }
            .btn-back:hover { background: #757575; }
            .alert { padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .alert-info { background: #E3F2FD; border-left: 4px solid #2196F3; color: #1976D2; }
        </style>
        <script>
            function changeYear() {
                const year = document.getElementById('yearSelect').value;
                window.location.href = '/ronda/admin-regenerate?year=' + year;
            }
        </script>
        </head><body>`;
        
        output += `<div class="container">`;
        output += `<h1>🔧 Admin - Regenerate Jadwal Ronda</h1>`;
        output += `<div class="alert alert-info">⚠️ <strong>Perhatian:</strong> Regenerate akan menghapus jadwal minggu tersebut dan membuat ulang dengan rotasi tim yang benar.</div>`;
        
        // Year selector
        output += `<div class="year-selector">`;
        output += `<label for="yearSelect">Pilih Tahun:</label>`;
        output += `<select id="yearSelect" onchange="changeYear()">`;
        for (let year = 2026; year <= 2030; year++) {
            const selected = year === selectedYear ? 'selected' : '';
            output += `<option value="${year}" ${selected}>${year}</option>`;
        }
        output += `</select>`;
        output += `<span style="margin-left: 20px; color: #666;">Total: ${saturdays.length} minggu</span>`;
        output += `</div>`;
        
        // Week list
        output += `<div class="week-list">`;
        saturdays.forEach(saturday => {
            const hasSchedule = existingDates.has(saturday.date);
            const itemClass = hasSchedule ? 'week-item has-schedule' : 'week-item';
            
            output += `<div class="${itemClass}">`;
            output += `<div class="week-info">`;
            output += `<div class="week-date">${saturday.displayDate}</div>`;
            output += `<div class="week-team">Tim ${saturday.team}</div>`;
            if (hasSchedule) {
                output += `<div class="week-status">✓ Jadwal sudah ada</div>`;
            }
            output += `</div>`;
            output += `<div class="week-actions">`;
            output += `<a href="/ronda/regenerate-week?date=${saturday.date}" class="btn btn-regenerate">🔄 Regenerate</a>`;
            output += `</div>`;
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

// Regenerate specific week
router.get('/regenerate-week', ensureAuthenticated, async (req, res) => {
    try {
        const db = require('../config/db');
        const Ronda = require('../models/Ronda');
        const moment = require('moment');
        
        const { date } = req.query;
        
        if (!date) {
            return res.redirect('/ronda/admin-regenerate');
        }
        
        const dateObj = moment(date);
        const displayDate = dateObj.format('DD MMMM YYYY');
        const year = dateObj.format('YYYY');
        
        // Calculate team
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C
        const teamsList = ['A', 'B', 'C', 'D'];
        const diffDays = dateObj.diff(epochDate, 'days');
        const diffWeeks = Math.floor(diffDays / 7);
        let teamIndex = (epochIndex + diffWeeks) % 4;
        if (teamIndex < 0) teamIndex += 4;
        const team = teamsList[teamIndex];
        
        let output = `<!DOCTYPE html><html><head><title>Regenerate ${displayDate}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #333; }
            .info-box { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info-box strong { color: #333; }
            .btn { display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px; }
            .btn-confirm { background: #f44336; color: white; }
            .btn-cancel { background: #9E9E9E; color: white; }
            .btn-success { background: #4CAF50; color: white; }
            .success { color: green; font-weight: bold; font-size: 18px; }
        </style>
        </head><body><div class="container">`;
        
        output += `<h2>🔄 Regenerate Jadwal Minggu</h2>`;
        
        if (req.query.confirm === 'yes') {
            // Hapus jadwal tanggal tersebut
            const [deleteResult] = await db.query(
                "DELETE FROM ronda_jadwal WHERE tanggal = ?",
                [date]
            );
            
            output += `<p>🗑️  Dihapus ${deleteResult.affectedRows} jadwal lama</p>`;
            
            // Generate ulang untuk tanggal ini saja
            // Get HOUSES for this team
            const [houses] = await db.query(`
                SELECT 
                    blok, 
                    nomor_rumah,
                    (SELECT id FROM warga w2 
                     WHERE w2.blok = w1.blok 
                     AND w2.nomor_rumah = w1.nomor_rumah 
                     AND w2.tim_ronda = w1.tim_ronda
                     AND w2.is_ronda = 1
                     ORDER BY 
                        CASE WHEN w2.status_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END,
                        w2.id
                     LIMIT 1
                    ) as representative_id
                FROM warga w1
                WHERE tim_ronda = ? AND is_ronda = 1
                GROUP BY blok, nomor_rumah
                ORDER BY blok ASC, CAST(nomor_rumah AS UNSIGNED) ASC
            `, [team]);
            
            let insertedCount = 0;
            for (const house of houses) {
                if (!house.representative_id) continue;
                
                try {
                    await db.query(
                        `INSERT INTO ronda_jadwal 
                        (tanggal, warga_id, blok, nomor_rumah, status) 
                        VALUES (?, ?, ?, ?, 'scheduled')`,
                        [date, house.representative_id, house.blok, house.nomor_rumah]
                    );
                    insertedCount++;
                } catch (e) {
                    console.error('Error inserting schedule:', e);
                }
            }
            
            output += `<p>✅ Berhasil membuat ${insertedCount} jadwal baru</p>`;
            output += `<p class="success">✅ Jadwal ${displayDate} berhasil di-regenerate!</p>`;
            output += `<a href="/ronda/admin-regenerate?year=${year}" class="btn btn-success">Kembali ke Daftar</a>`;
        } else {
            output += `<div class="info-box">`;
            output += `<strong>Tanggal:</strong> ${displayDate}<br>`;
            output += `<strong>Tim:</strong> Tim ${team}`;
            output += `</div>`;
            output += `<p>⚠️  Ini akan menghapus SEMUA jadwal tanggal ${displayDate} dan generate ulang dengan rotasi tim yang benar.</p>`;
            output += `<p><strong>Yakin ingin melanjutkan?</strong></p>`;
            output += `<a href="/ronda/regenerate-week?date=${date}&confirm=yes" class="btn btn-confirm">✓ Ya, Regenerate</a>`;
            output += `<a href="/ronda/admin-regenerate?year=${year}" class="btn btn-cancel">✗ Batal</a>`;
        }
        
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
router.post('/v/update-status', rondaController.updatePublicStatus);
router.post('/share/update-image', rondaController.updateShareImage);

module.exports = router;
