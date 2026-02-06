const db = require('../config/db');

const createTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                username VARCHAR(255),
                action VARCHAR(50),
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        `);
        console.log('activity_logs table created or already exists.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating activity_logs table:', err);
        process.exit(1);
    }
};

createTable();
