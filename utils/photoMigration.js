const db = require('../config/db');

async function migratePhoto() {
    try {
        console.log('Checking profile_photo_url schema...');

        const [columns] = await db.query("SHOW COLUMNS FROM users LIKE 'profile_photo_url'");
        if (columns.length === 0) {
            console.log('Adding profile_photo_url column...');
            await db.query("ALTER TABLE users ADD COLUMN profile_photo_url TEXT DEFAULT NULL");
        } else {
            console.log('profile_photo_url column already exists.');
        }

        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

module.exports = migratePhoto;
