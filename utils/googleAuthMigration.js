const db = require('../config/db');

async function ensureSchema() {
    try {
        console.log('Checking Google Auth schema...');

        // Check google_id
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'google_id'");
            if (columns.length === 0) {
                console.log('Adding google_id column...');
                await db.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL");
            }
        } catch (e) {
            console.error('Error checking google_id:', e.message);
        }

        // Check email
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'email'");
            if (columns.length === 0) {
                console.log('Adding email column...');
                await db.query("ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE DEFAULT NULL");
            }
        } catch (e) {
            console.error('Error checking email:', e.message);
        }

        // Modify password to be nullable
        try {
            console.log('Ensuring password is nullable...');
            await db.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
        } catch (e) {
            console.error('Error modifying password column:', e.message);
        }

        console.log('Google Auth schema check complete.');
    } catch (err) {
        console.error('Schema check failed:', err);
    }
}

module.exports = ensureSchema;
