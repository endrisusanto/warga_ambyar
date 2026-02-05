-- Migration: Add metode_pembayaran column to iuran table
-- Date: 2026-02-05
-- Description: Adds payment method tracking (DANA, QRIS, Tunai)

ALTER TABLE iuran 
ADD COLUMN metode_pembayaran ENUM('DANA', 'QRIS', 'Tunai') DEFAULT NULL 
AFTER bukti_bayar;

-- Optional: Update schema.sql to include this column in CREATE TABLE statement
