const mysql = require('mysql2/promise');
const moment = require('moment');
require('dotenv').config();

async function cleanupRondaSchedules() {
    console.log('🧹 Membersihkan jadwal ronda yang tidak valid...\n');
    
    // Buat koneksi database
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'warga_ambyar',
        port: process.env.DB_PORT || 3306
    });

    try {
        // Query untuk menemukan dan menampilkan jadwal yang akan dihapus
        const [toDelete] = await connection.query(`
            SELECT 
                s.id,
                s.warga_id,
                s.tanggal,
                s.status,
                h.tanggal as hadir_date
            FROM ronda_jadwal s
            INNER JOIN ronda_jadwal h ON s.warga_id = h.warga_id
            WHERE 
                s.status IN ('scheduled', 'reschedule')
                AND h.status = 'hadir'
                AND h.tanggal < s.tanggal
                AND h.tanggal >= DATE_SUB(s.tanggal, INTERVAL 4 WEEK)
                AND s.tanggal <= DATE_ADD(h.tanggal, INTERVAL 4 WEEK)
        `);

        console.log(`📊 Ditemukan ${toDelete.length} jadwal yang akan dihapus:\n`);
        
        toDelete.forEach(row => {
            console.log(`❌ Warga ID: ${row.warga_id}, Tanggal: ${moment(row.tanggal).format('DD MMM YYYY')}, Status: ${row.status}`);
            console.log(`   Alasan: Sudah hadir di ${moment(row.hadir_date).format('DD MMM YYYY')}\n`);
        });

        if (toDelete.length > 0) {
            // Hapus jadwal yang tidak valid
            const [result] = await connection.query(`
                DELETE FROM ronda_jadwal 
                WHERE id IN (
                    SELECT s.id
                    FROM (SELECT * FROM ronda_jadwal) s
                    INNER JOIN ronda_jadwal h ON s.warga_id = h.warga_id
                    WHERE 
                        s.status IN ('scheduled', 'reschedule')
                        AND h.status = 'hadir'
                        AND h.tanggal < s.tanggal
                        AND h.tanggal >= DATE_SUB(s.tanggal, INTERVAL 4 WEEK)
                        AND s.tanggal <= DATE_ADD(h.tanggal, INTERVAL 4 WEEK)
                )
            `);

            console.log(`\n✅ Selesai! Total ${result.affectedRows} jadwal dihapus.`);
        } else {
            console.log('\n✅ Tidak ada jadwal yang perlu dihapus.');
        }
        
        // Tutup koneksi database
        await connection.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        try {
            await connection.end();
        } catch (e) {}
        process.exit(1);
    }
}

cleanupRondaSchedules();

