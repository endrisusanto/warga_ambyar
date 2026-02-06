const db = require('../config/db');

module.exports = async () => {
    try {
        console.log('Running user activity tracking migration...');
        
        // Add columns to users table
        const columns = [
            { name: 'last_active', type: 'DATETIME DEFAULT NULL' },
            { name: 'last_ip', type: 'VARCHAR(45) DEFAULT NULL' },
            { name: 'last_user_agent', type: 'TEXT DEFAULT NULL' }
        ];

        for (const col of columns) {
            try {
                await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name} column to users`);
            } catch (e) {
                if (!e.message.includes('Duplicate column')) {
                    console.error(`Error adding ${col.name} column:`, e.message);
                }
            }
        }

    } catch (err) {
        console.error('❌ User activity migration failed:', err.message);
    }
};
