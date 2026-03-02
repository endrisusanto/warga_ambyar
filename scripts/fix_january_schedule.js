const mysql = require('mysql2/promise');
const moment = require('moment');
require('dotenv').config();

async function fixJanuarySchedule() {
    console.log('🔧 Memperbaiki jadwal ronda Januari 2026...\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'warga_ambyar',
        port: process.env.DB_PORT || 3306
    });

    try {
        // Hapus semua jadwal Januari 2026 yang statusnya masih 'scheduled'
        console.log('🗑️  Menghapus jadwal scheduled Januari 2026...');
        const [deleteResult] = await connection.query(
            "DELETE FROM ronda_jadwal WHERE tanggal BETWEEN '2026-01-01' AND '2026-01-31' AND status = 'scheduled'"
        );
        console.log(`   Dihapus: ${deleteResult.affectedRows} jadwal\n`);

        // Generate ulang dengan logika yang benar
        console.log('✨ Generate ulang jadwal Januari 2026...\n');
        
        const teamsList = ['A', 'B', 'C', 'D'];
        const epochDate = moment('2026-01-10');
        const epochIndex = 2; // C

        // Sabtu-sabtu di Januari 2026
        const saturdays = ['2026-01-03', '2026-01-10', '2026-01-17', '2026-01-24', '2026-01-31'];

        for (const dateStr of saturdays) {
            const dateObj = moment(dateStr);
            const diffDays = dateObj.diff(epochDate, 'days');
            const diffWeeks = Math.floor(diffDays / 7);

            let teamIndex = (epochIndex + diffWeeks) % 4;
            if (teamIndex < 0) teamIndex += 4;
            const currentTeam = teamsList[teamIndex];

            console.log(`📅 ${dateObj.format('DD MMM YYYY')} → Tim ${currentTeam}`);

            // Get members of this team
            const [members] = await connection.query(
                "SELECT id, nama FROM warga WHERE tim_ronda = ? AND is_ronda = 1",
                [currentTeam]
            );

            for (const member of members) {
                // Check if already scheduled
                const [existing] = await connection.query(
                    "SELECT id, status FROM ronda_jadwal WHERE tanggal = ? AND warga_id = ?",
                    [dateStr, member.id]
                );

                if (existing.length === 0) {
                    // Insert new schedule
                    await connection.query(
                        "INSERT INTO ronda_jadwal (tanggal, warga_id, status) VALUES (?, ?, 'scheduled')",
                        [dateStr, member.id]
                    );
                    console.log(`   ✓ ${member.nama} dijadwalkan`);
                } else {
                    console.log(`   ⊙ ${member.nama} sudah ada (status: ${existing[0].status})`);
                }
            }
            console.log('');
        }

        console.log('\n✅ Selesai! Jadwal Januari 2026 sudah diperbaiki.');
        
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

fixJanuarySchedule();
