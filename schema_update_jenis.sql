-- Update jenis column to include 'kas' and 'sampah'
ALTER TABLE iuran MODIFY COLUMN jenis ENUM('keamanan', 'sampah', 'kas') NOT NULL;
