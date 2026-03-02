const db = require('../config/db');

module.exports = async () => {
    try {
        console.log('Running house-based ronda migration...');
        
        // Add columns if they don't exist
        try {
            await db.query(`ALTER TABLE ronda_jadwal ADD COLUMN blok ENUM('F7', 'F8') DEFAULT NULL AFTER warga_id`);
            console.log('✅ Added blok column to ronda_jadwal');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.error('Error adding blok column:', e.message);
            }
        }

        try {
            await db.query(`ALTER TABLE ronda_jadwal ADD COLUMN nomor_rumah INT DEFAULT NULL AFTER blok`);
            console.log('✅ Added nomor_rumah column to ronda_jadwal');
        } catch (e) {
            if (!e.message.includes('Duplicate column')) {
                console.error('Error adding nomor_rumah column:', e.message);
            }
        }

        // Add indexes
        try {
            await db.query(`CREATE INDEX idx_house ON ronda_jadwal(blok, nomor_rumah)`);
            console.log('✅ Created index idx_house');
        } catch (e) {
            if (!e.message.includes('Duplicate key')) {
                console.error('Error creating index idx_house:', e.message);
            }
        }

        try {
            await db.query(`CREATE INDEX idx_tanggal_house ON ronda_jadwal(tanggal, blok, nomor_rumah)`);
            console.log('✅ Created index idx_tanggal_house');
        } catch (e) {
            if (!e.message.includes('Duplicate key')) {
                console.error('Error creating index idx_tanggal_house:', e.message);
            }
        }

        // Populate data
        console.log('Populating house data in ronda_jadwal...');
        const [result] = await db.query(`
            UPDATE ronda_jadwal rj
            INNER JOIN warga w ON rj.warga_id = w.id
            SET rj.blok = w.blok, rj.nomor_rumah = w.nomor_rumah
            WHERE rj.blok IS NULL OR rj.nomor_rumah IS NULL
        `);
        console.log(`✅ Data populated: ${result.affectedRows} rows updated`);

    } catch (err) {
        console.error('❌ House-based ronda migration failed:', err.message);
    }
};
