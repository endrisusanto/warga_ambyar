const db = require('../config/db');

module.exports = async function fixRoleColumn() {
    try {
        console.log('Checking role column in users table...');

        // Check current definition
        const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'role'");
        // console.log('Current column definition:', columns);

        // Modify column to be VARCHAR(50) NOT NULL DEFAULT 'warga'
        // This is safe to run multiple times as it just sets the type
        await db.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'warga'");

        console.log('Role column fixed.');
    } catch (err) {
        console.error('Role migration failed:', err);
    }
};
