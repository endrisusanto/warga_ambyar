const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
    let conn;
    try {
        console.log('--- Verification Started ---');
        conn = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: 'rootpassword',
            database: 'rt_rw_db',
            port: 3306
        });

        const tables = {
            warga: ['email', 'tim_ronda', 'status_huni'],
            users: ['profile_photo_url'],
            musyawarah: ['created_by'],
            pengaduan_comments: ['lampiran'],
            iuran: ['tanggal_konfirmasi', 'dibayar_oleh']
        };

        for (const [table, columns] of Object.entries(tables)) {
            console.log(`Checking table: ${table}`);
            const [cols] = await conn.query(`SHOW COLUMNS FROM ${table}`);
            const existingCols = cols.map(c => c.Field);
            for (const col of columns) {
                if (existingCols.includes(col)) {
                    const colDef = cols.find(c => c.Field === col);
                    console.log(`✅ ${table}.${col} exists. Type: ${colDef.Type}`);
                } else {
                    console.log(`❌ ${table}.${col} is MISSING.`);
                }
            }
        }

    } catch (e) {
        console.error('Error during verification:', e.message);
        console.log('Note: If connection failed, please verify by checking the application logs after restart.');
    } finally {
        if (conn) await conn.end();
        console.log('--- Verification Finished ---');
    }
}
verify();
