const db = require('../config/db');

module.exports = async function () {
    try {
        await db.query(`
            SELECT count(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
            AND TABLE_NAME = 'iuran'
            AND COLUMN_NAME = 'dibayar_oleh'
        `).then(async ([rows]) => {
            if (rows[0]['count(*)'] === 0) {
                console.log('Adding dibayar_oleh column to iuran table...');
                await db.query("ALTER TABLE iuran ADD COLUMN dibayar_oleh INT DEFAULT NULL");
                await db.query("ALTER TABLE iuran ADD CONSTRAINT fk_iuran_payer FOREIGN KEY (dibayar_oleh) REFERENCES warga(id) ON DELETE SET NULL");
                console.log('dibayar_oleh column added successfully.');
            }
        });
    } catch (error) {
        console.error('Migration addDibayarOlehCol failed:', error);
    }
};
