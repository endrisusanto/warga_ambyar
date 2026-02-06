const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
});

console.log('🔌 Connecting to database...');

connection.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database');
    
    // Read migration file
    const migrationSQL = fs.readFileSync(
        path.join(__dirname, '../migrations/add_house_to_ronda_jadwal.sql'), 
        'utf8'
    );
    
    console.log('\n📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n🚀 Running migration...\n');
    
    // Execute migration
    connection.query(migrationSQL, (err, results) => {
        if (err) {
            console.error('❌ Migration failed:', err.message);
            connection.end();
            process.exit(1);
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Verify columns were added
        connection.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ronda_jadwal'
            AND COLUMN_NAME IN ('blok', 'nomor_rumah')
        `, [process.env.DB_NAME], (err, columns) => {
            if (err) {
                console.error('❌ Verification failed:', err.message);
            } else {
                console.log('\n✅ Verification - New columns:');
                console.table(columns);
            }
            
            // Check indexes
            connection.query(`
                SHOW INDEX FROM ronda_jadwal 
                WHERE Key_name IN ('idx_house', 'idx_tanggal_house')
            `, (err, indexes) => {
                if (err) {
                    console.error('❌ Index verification failed:', err.message);
                } else {
                    console.log('\n✅ Verification - New indexes:');
                    console.table(indexes.map(idx => ({
                        Key_name: idx.Key_name,
                        Column_name: idx.Column_name,
                        Seq_in_index: idx.Seq_in_index
                    })));
                }
                
                // Count records with blok and nomor_rumah populated
                connection.query(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN blok IS NOT NULL THEN 1 ELSE 0 END) as with_blok,
                        SUM(CASE WHEN nomor_rumah IS NOT NULL THEN 1 ELSE 0 END) as with_nomor_rumah
                    FROM ronda_jadwal
                `, (err, count) => {
                    if (err) {
                        console.error('❌ Count verification failed:', err.message);
                    } else {
                        console.log('\n✅ Data population:');
                        console.table(count);
                    }
                    
                    connection.end();
                    console.log('\n🔌 Database connection closed');
                    console.log('\n🎉 All done! You can now access /ronda/control?year=2026');
                    process.exit(0);
                });
            });
        });
    });
});
