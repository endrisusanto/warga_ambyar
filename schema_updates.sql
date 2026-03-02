-- Add approval status for house registration
ALTER TABLE warga ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER status_huni;

-- Add photos column for ronda evidence
ALTER TABLE ronda_jadwal ADD COLUMN IF NOT EXISTS foto_bukti TEXT AFTER keterangan;
