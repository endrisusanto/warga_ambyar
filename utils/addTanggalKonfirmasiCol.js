const db = require('../config/db');

module.exports = async function () {
    try {
        console.log('Checking for tanggal_konfirmasi column in iuran table...');
        const [rows] = await db.query(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
            AND TABLE_NAME = 'iuran' 
            AND COLUMN_NAME = 'tanggal_konfirmasi'
        `);

        if (rows.length === 0) {
            console.log('Adding tanggal_konfirmasi column to iuran table...');
            await db.query("ALTER TABLE iuran ADD COLUMN tanggal_konfirmasi DATETIME DEFAULT NULL");
            console.log('Column added successfully.');
        } else {
            console.log('tanggal_konfirmasi column already exists.');
        }
    } catch (error) {
        console.error('Migration addTanggalKonfirmasiCol failed:', error);
    }
};
