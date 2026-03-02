CREATE TABLE IF NOT EXISTS ronda_jadwal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATE NOT NULL,
    warga_id INT NOT NULL,
    status ENUM('scheduled', 'hadir', 'izin', 'alpa') DEFAULT 'scheduled',
    denda DECIMAL(10, 2) DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE CASCADE,
    UNIQUE KEY unique_schedule (tanggal, warga_id)
);

-- Add password reset token or similar if needed, but for now just direct update
