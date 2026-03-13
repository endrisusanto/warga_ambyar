const pool = require('./config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        // Fix donasi_campaign
        console.log('Checking donasi_campaign...');
        const [campaignCols] = await pool.query('SHOW COLUMNS FROM donasi_campaign');
        const campaignColNames = campaignCols.map(c => c.Field);
        
        if (!campaignColNames.includes('tipe_target')) {
            console.log('Adding tipe_target to donasi_campaign...');
            await pool.query("ALTER TABLE donasi_campaign ADD COLUMN tipe_target ENUM('total', 'per_rumah') DEFAULT 'total' AFTER target_dana");
        }
        
        if (!campaignColNames.includes('allow_anonim')) {
            console.log('Adding allow_anonim to donasi_campaign...');
            await pool.query("ALTER TABLE donasi_campaign ADD COLUMN allow_anonim BOOLEAN DEFAULT FALSE AFTER tipe_target");
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
