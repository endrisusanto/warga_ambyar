-- Migration: Add foto_profil column to warga table
-- Run this SQL to add profile photo support

ALTER TABLE warga ADD COLUMN foto_profil VARCHAR(255) AFTER no_hp;
