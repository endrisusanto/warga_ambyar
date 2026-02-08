-- Add monitoring columns to users table
-- We use separate statements so if one fails (exists), others can proceed
ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_ip VARCHAR(45) DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_user_agent TEXT DEFAULT NULL;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Ensure username column exists if table was already created
ALTER TABLE activity_logs ADD COLUMN username VARCHAR(100) AFTER user_id;

-- Index for performance
CREATE INDEX idx_user_activity ON users(last_active);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at);
