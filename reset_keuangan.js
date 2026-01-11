require('dotenv').config();
const db = require('./config/db');

async function resetKeuangan() {
    try {
        console.log('Starting keuangan reset...');

        // 1. Truncate kas table (cash flow log)
        await db.query("TRUNCATE TABLE kas");
        console.log('✓ Kas (cash flow) log cleared');

        // 2. Reset all iuran payment status to 'belum_bayar'
        const resetIuran = await db.query(`
            UPDATE iuran 
            SET status = 'belum_bayar', 
                tanggal_bayar = NULL 
            WHERE status = 'lunas'
        `);
        console.log(`✓ Reset ${resetIuran[0].affectedRows} iuran payments to 'belum_bayar'`);

        console.log('\n✅ Keuangan reset completed successfully!');
        console.log('Summary:');
        console.log('- Kas: All transaction logs deleted');
        console.log('- Iuran: All payments reset to unpaid');
        console.log('\nNote: Saldo will be Rp 0 after reset');

        process.exit(0);
    } catch (e) {
        console.error('❌ Error resetting keuangan:', e);
        process.exit(1);
    }
}

resetKeuangan();
