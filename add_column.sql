ALTER TABLE iuran ADD COLUMN IF NOT EXISTS metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL AFTER bukti_bayar;
SELECT 'Migration completed!' as status;
DESCRIBE iuran;
