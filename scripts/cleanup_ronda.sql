-- Script SQL untuk membersihkan jadwal ronda yang tidak valid
-- Hapus jadwal scheduled/reschedule yang masih dalam range 4 minggu setelah warga hadir

-- Temporary table untuk menyimpan jadwal yang perlu dihapus
CREATE TEMPORARY TABLE IF NOT EXISTS temp_delete_schedules AS
SELECT 
    s.id,
    s.warga_id,
    s.tanggal,
    s.status,
    h.tanggal as hadir_date
FROM ronda_jadwal s
INNER JOIN ronda_jadwal h ON s.warga_id = h.warga_id
WHERE 
    s.status IN ('scheduled', 'reschedule')
    AND h.status = 'hadir'
    AND h.tanggal < s.tanggal
    AND h.tanggal >= DATE_SUB(s.tanggal, INTERVAL 4 WEEK)
    AND s.tanggal <= DATE_ADD(h.tanggal, INTERVAL 4 WEEK);

-- Tampilkan jadwal yang akan dihapus
SELECT 
    CONCAT('Warga ID: ', warga_id, ', Tanggal: ', DATE_FORMAT(tanggal, '%d %b %Y'), ', Status: ', status, ' -> Sudah hadir di ', DATE_FORMAT(hadir_date, '%d %b %Y')) as info
FROM temp_delete_schedules;

-- Hapus jadwal yang tidak valid
DELETE FROM ronda_jadwal 
WHERE id IN (SELECT id FROM temp_delete_schedules);

-- Tampilkan jumlah yang dihapus
SELECT CONCAT('Total ', COUNT(*), ' jadwal dihapus') as result FROM temp_delete_schedules;

-- Hapus temporary table
DROP TEMPORARY TABLE IF EXISTS temp_delete_schedules;
