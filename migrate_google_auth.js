const db = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration for Google Auth...');

        // Check if google_id column exists
        const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'google_id'");
        if (columns.length === 0) {
            console.log('Adding google_id column...');
            await db.query("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL");
        } else {
            console.log('google_id column already exists.');
        }

        // Check if email column exists
        const [emailCol] = await db.query("SHOW COLUMNS FROM users LIKE 'email'");
        if (emailCol.length === 0) {
            console.log('Adding email column...');
            await db.query("ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE DEFAULT NULL");
        } else {
            console.log('email column already exists.');
        }

        // Make password nullable
        console.log('Modifying password column to be nullable...');
        await db.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
