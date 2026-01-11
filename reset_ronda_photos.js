require('dotenv').config();
const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function reset() {
    console.log('Resetting Ronda Photos and Uploads...');
    try {
        // Table: ronda_dokumentasi
        // Check if table exists or just try catch
        try {
            await db.query('TRUNCATE TABLE ronda_dokumentasi');
            console.log('Truncated ronda_dokumentasi');
        } catch (e) {
            console.warn('Could not truncate ronda_dokumentasi:', e.message);
        }

        // Clear individual proofs in ronda_jadwal
        try {
            await db.query('UPDATE ronda_jadwal SET foto_bukti = NULL');
            console.log('Cleared foto_bukti in ronda_jadwal');
        } catch (e) {
            console.warn('Could not update ronda_jadwal:', e.message);
        }

        const uploadsPath = path.join(__dirname, 'public', 'uploads');
        if (fs.existsSync(uploadsPath)) {
            const folders = ['ronda', 'shares'];
            for (const f of folders) {
                const dir = path.join(uploadsPath, f);
                if (fs.existsSync(dir)) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`Cleared public/uploads/${f}`);
                } else {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`Created public/uploads/${f}`);
                }
            }
        } else {
            fs.mkdirSync(uploadsPath, { recursive: true });
            ['ronda', 'shares'].forEach(d => {
                fs.mkdirSync(path.join(uploadsPath, d), { recursive: true });
            });
            console.log('Created uploads directory structure.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
