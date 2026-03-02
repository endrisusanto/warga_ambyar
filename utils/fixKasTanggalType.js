const db = require('../config/db');

module.exports = async function () {
    try {
        console.log('Checking kas table date column type...');
        const [rows] = await db.query(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
            AND TABLE_NAME = 'kas' 
            AND COLUMN_NAME = 'tanggal'
        `);

        if (rows.length > 0 && rows[0].COLUMN_TYPE.toLowerCase() === 'date') {
            console.log('Converting kas.tanggal from DATE to DATETIME...');
            await db.query("ALTER TABLE kas MODIFY COLUMN tanggal DATETIME NOT NULL");
            console.log('Conversion successful.');
        } else {
            console.log('kas.tanggal is already DATETIME or table column not found.');
        }
    } catch (error) {
        console.error('Migration fixKasTanggalType failed:', error);
    }
};
