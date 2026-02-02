const db = require('../config/db');
const Ronda = require('../models/Ronda');

async function regenerateJanuary() {
    try {
        console.log('🗑️  Menghapus semua jadwal Januari 2026...');
        
        // Hapus SEMUA jadwal Januari (tidak peduli status)
        const [result] = await db.query(
            "DELETE FROM ronda_jadwal WHERE tanggal BETWEEN '2026-01-01' AND '2026-01-31'"
        );
        
        console.log(`   ✓ Dihapus ${result.affectedRows} jadwal\n`);
        
        console.log('✨ Generate ulang jadwal Januari 2026...');
        await Ronda.generateSchedule('01', '2026');
        
        console.log('\n✅ Selesai! Silakan cek /ronda?month=1&year=2026\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

regenerateJanuary();
