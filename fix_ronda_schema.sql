DROP TABLE IF EXISTS ronda_jadwal;
CREATE TABLE ronda_jadwal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATE NOT NULL,
    warga_id INT NOT NULL,
    status ENUM('scheduled', 'hadir', 'alpa', 'izin', 'reschedule') DEFAULT 'scheduled',
    denda INT DEFAULT 0,
    keterangan TEXT,
    foto_bukti JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ronda_dokumentasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATE NOT NULL,
    foto JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure tim_ronda exists in warga
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'rt_rw_db' AND TABLE_NAME = 'warga' AND COLUMN_NAME = 'tim_ronda');
SET @sql := IF(@exist = 0, 'ALTER TABLE warga ADD COLUMN tim_ronda VARCHAR(5) DEFAULT NULL', 'SELECT "Column tim_ronda already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
