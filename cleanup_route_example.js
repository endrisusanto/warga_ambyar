// Tambahkan route ini ke routes/ronda.js untuk cleanup manual
router.get('/cleanup-schedules', async (req, res) => {
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

        let output = `<h2>Cleanup Jadwal Ronda</h2>`;
        output += `<p>Ditemukan ${toDelete.length} jadwal yang akan dihapus:</p><ul>`;
        
        toDelete.forEach(row => {
            output += `<li>Warga: ${row.nama} (ID: ${row.warga_id}), Tanggal: ${moment(row.tanggal).format('DD MMM YYYY')}, Status: ${row.status} - Sudah hadir di ${moment(row.hadir_date).format('DD MMM YYYY')}</li>`;
        });
        output += `</ul>`;

        if (toDelete.length > 0 && req.query.confirm === 'yes') {
            // Hapus jadwal
            const ids = toDelete.map(r => r.id);
            await db.query('DELETE FROM ronda_jadwal WHERE id IN (?)', [ids]);
            output += `<p style="color: green; font-weight: bold;">✅ ${ids.length} jadwal berhasil dihapus!</p>`;
            output += `<p><a href="/ronda/control">Kembali ke Control</a></p>`;
        } else if (toDelete.length > 0) {
            output += `<p><a href="/ronda/cleanup-schedules?confirm=yes" style="background: red; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Konfirmasi Hapus</a></p>`;
            output += `<p><a href="/ronda/control">Batal</a></p>`;
        } else {
            output += `<p style="color: green;">✅ Tidak ada jadwal yang perlu dihapus.</p>`;
            output += `<p><a href="/ronda/control">Kembali ke Control</a></p>`;
        }

        res.send(output);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});
