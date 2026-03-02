-- Add blok and nomor_rumah columns to ronda_jadwal
ALTER TABLE ronda_jadwal ADD COLUMN blok ENUM('F7', 'F8') DEFAULT NULL AFTER warga_id;
ALTER TABLE ronda_jadwal ADD COLUMN nomor_rumah INT DEFAULT NULL AFTER blok;

-- Create indexes
CREATE INDEX idx_house ON ronda_jadwal(blok, nomor_rumah);
CREATE INDEX idx_tanggal_house ON ronda_jadwal(tanggal, blok, nomor_rumah);

-- Populate blok and nomor_rumah for existing records
UPDATE ronda_jadwal rj
INNER JOIN warga w ON rj.warga_id = w.id
SET rj.blok = w.blok, rj.nomor_rumah = w.nomor_rumah
WHERE rj.blok IS NULL OR rj.nomor_rumah IS NULL;
