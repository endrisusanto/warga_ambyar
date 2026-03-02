const pool = require('./config/db');

(async () => {
    try {
        await pool.query('ALTER TABLE donasi_campaign ADD COLUMN allow_anonim TINYINT(1) DEFAULT 1');
        console.log('Column allow_anonim added');
    } catch(e) {
        console.log('Error adding column:', e.message);
    }
    process.exit(0);
})();
