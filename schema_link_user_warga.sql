-- Add warga_id to users table to link login with profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS warga_id INT;
ALTER TABLE users ADD CONSTRAINT fk_user_warga FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL;
