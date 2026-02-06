const db = require('../config/db');

module.exports = async () => {
    try {
        // Create activity_logs table if not exists
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
        
        console.log('✓ Activity logs table ready');
        
        // Insert a test entry if table is empty
        const [rows] = await db.query('SELECT COUNT(*) as count FROM activity_logs');
        if (rows[0].count === 0) {
            await db.query(`
                INSERT INTO activity_logs (username, action, details, ip_address, user_agent) 
                VALUES ('System', 'INIT', 'Activity logging system initialized', '127.0.0.1', 'Server')
            `);
            console.log('✓ Activity logs initialized with test entry');
        }
        
    } catch (err) {
        console.error('Activity logs migration error:', err.message);
    }
};
