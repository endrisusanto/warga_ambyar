ALTER TABLE ronda_jadwal MODIFY COLUMN status ENUM('scheduled', 'hadir', 'izin', 'alpa', 'reschedule') DEFAULT 'scheduled';
