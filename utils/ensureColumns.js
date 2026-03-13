const db = require('../config/db');

/**
 * Robustly ensure columns exist in specified tables.
 * This fixes issues where migrations failed during startup due to DB unreadiness.
 */
module.exports = async function ensureColumns() {
    try {
        console.log('🏁 Starting comprehensive column check...');

        const checks = [
            { table: 'warga', column: 'email', definition: 'VARCHAR(255) DEFAULT NULL' },
            { table: 'warga', column: 'tim_ronda', definition: 'VARCHAR(5) DEFAULT NULL' },
            { table: 'users', column: 'profile_photo_url', definition: 'VARCHAR(255) DEFAULT NULL' },
            { table: 'musyawarah', column: 'created_by', definition: 'INT' },
            { table: 'musyawarah', column: 'created_by', fk: 'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL' },
            { table: 'pengaduan_comments', column: 'lampiran', definition: 'VARCHAR(255) DEFAULT NULL' },
            { table: 'iuran', column: 'tanggal_konfirmasi', definition: 'DATETIME DEFAULT NULL' },
            { table: 'iuran', column: 'dibayar_oleh', definition: 'INT' },
            { table: 'iuran', column: 'dibayar_oleh', definition: 'INT' },
            { table: 'iuran', column: 'dibayar_oleh', fk: 'FOREIGN KEY (dibayar_oleh) REFERENCES users(id) ON DELETE SET NULL' },
            { table: 'warga', column: 'status_huni', definition: "ENUM('tetap', 'kontrak', 'kosong', 'tidak huni') DEFAULT 'tetap'" }
        ];

        for (const check of checks) {
            try {
                // Check table existence first
                const [tables] = await db.query(`SHOW TABLES LIKE '${check.table}'`);
                if (tables.length === 0) {
                    console.warn(`⚠️ Table [${check.table}] does not exist. Skipping [${check.column}].`);
                    continue;
                }

                if (check.definition) {
                    const [columns] = await db.query(`SHOW COLUMNS FROM ${check.table} LIKE '${check.column}'`);
                    if (columns.length === 0) {
                        console.log(`➕ Adding column [${check.column}] to table [${check.table}]...`);
                        await db.query(`ALTER TABLE ${check.table} ADD COLUMN ${check.column} ${check.definition}`);
                        console.log(`✅ Column [${check.column}] added to [${check.table}].`);
                    } else if (check.column === 'status_huni') {
                        // Special case: force update ENUM to ensure all options exist
                        console.log(`🔄 Updating ENUM for [${check.table}.${check.column}]...`);
                        await db.query(`ALTER TABLE ${check.table} MODIFY COLUMN ${check.column} ${check.definition}`);
                        console.log(`✅ ENUM for [${check.table}.${check.column}] updated.`);
                    }
                } else if (check.fk) {
                    // Try to add FK, ignore if already exists (MySQL doesn't have an easy "IF NOT EXISTS" for FKs in ALTER)
                    try {
                        console.log(`🔗 Adding foreign key to [${check.table}.${check.column}]...`);
                        await db.query(`ALTER TABLE ${check.table} ADD ${check.fk}`);
                        console.log(`✅ Foreign key added to [${check.table}.${check.column}].`);
                    } catch (fkErr) {
                        if (fkErr.message.includes('Foreign key constraint is incorrectly formed') || fkErr.message.includes('Duplicate field name')) {
                             // Likely already exists or same constraint name issue
                        } else {
                            throw fkErr;
                        }
                    }
                }
            } catch (err) {
                // If it's a "Duplicate column" error, we can ignore it
                if (err.message.includes('Duplicate column')) {
                    // Already exists
                } else if (err.message.includes("Table") && err.message.includes("doesn't exist")) {
                    console.warn(`⚠️ Table [${check.table}] does not exist yet. Skipping column [${check.column}].`);
                } else {
                    console.error(`❌ Error ensuring column [${check.column}] in [${check.table}]: ${err.message}`);
                }
            }
        }

        console.log('✅ Comprehensive column check finished.');
    } catch (err) {
        console.error('❌ Global error in ensureColumns:', err.message);
    }
};
