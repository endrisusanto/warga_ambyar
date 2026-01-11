require('dotenv').config();
const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const tables = [
    'kas',
    'iuran',
    'dokumentasi_ronda',
    'ronda',
    'users',
    'warga'
];

async function reset() {
    console.log('Resetting database...');
    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const table of tables) {
            try {
                await db.query(`TRUNCATE TABLE ${table}`);
                console.log(`Truncated ${table}`);
            } catch (e) {
                console.error(`Error truncating ${table}:`, e.message);
            }
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database reset complete.');

        console.log('Clearing uploads...');
        const uploadsPath = path.join(__dirname, 'public', 'uploads');

        if (fs.existsSync(uploadsPath)) {
            fs.rmSync(uploadsPath, { recursive: true, force: true });
            fs.mkdirSync(uploadsPath, { recursive: true });

            // Recreate subfolders
            ['ronda', 'shares'].forEach(d => {
                fs.mkdirSync(path.join(uploadsPath, d), { recursive: true });
            });
            // Add others if needed like for iuran proofs
        } else {
            fs.mkdirSync(uploadsPath, { recursive: true });
        }
        console.log('Uploads cleared.');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
