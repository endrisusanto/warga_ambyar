const fs = require('fs');

try {
    fs.writeFileSync('debug_db.txt', 'Starting...\n');

    try {
        const db = require('./config/db');
        fs.appendFileSync('debug_db.txt', 'DB module loaded.\n');

        // Try to query
        db.query('SELECT 1').then(() => {
            fs.appendFileSync('debug_db.txt', 'DB connected.\n');
            process.exit(0);
        }).catch(err => {
            fs.appendFileSync('debug_db.txt', `DB connection failed: ${err.message}\n`);
            process.exit(1);
        });

    } catch (e) {
        fs.appendFileSync('debug_db.txt', `Require failed: ${e.message}\n`);
        process.exit(1);
    }

} catch (err) {
    console.error('FS failed:', err);
    process.exit(1);
}
