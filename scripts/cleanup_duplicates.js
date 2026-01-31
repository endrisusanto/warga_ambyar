const mysql = require('mysql2/promise');
require('dotenv').config();

const cleanup = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'rootpassword',
            database: process.env.DB_NAME || 'rt_rw_db',
            port: process.env.DB_PORT || 3306
        });

        console.log('Cleaning up duplicate warga entries...');

        // 1. Get all duplicates (same blok + nomor_rumah)
        const [rows] = await connection.query(`
            SELECT blok, nomor_rumah, COUNT(*) as count 
            FROM warga 
            WHERE blok IS NOT NULL AND nomor_rumah IS NOT NULL
            GROUP BY blok, nomor_rumah 
            HAVING count > 1
        `);

        console.log(`Found ${rows.length} houses with duplicates.`);

        for (const house of rows) {
            const [residents] = await connection.query(`
                SELECT w.*, u.id as user_id 
                FROM warga w
                LEFT JOIN users u ON w.id = u.warga_id
                WHERE w.blok = ? AND w.nomor_rumah = ?
                ORDER BY w.id ASC
            `, [house.blok, house.nomor_rumah]);

            console.log(`\nHouse ${house.blok}-${house.nomor_rumah} has ${residents.length} records:`);
            
            // Logic to identify keepers vs debris
            let keeper = null;
            const debris = [];

            // Priority 1: Has User Account
            const withAccount = residents.filter(r => r.user_id);
            if (withAccount.length > 0) {
                keeper = withAccount[0]; // Keep first account holder
                // Others are debris unless there are multi-family logic, but assuming single KK per house for now based on previous constraint
                // Actually, wait. User might have Istri/Anak. We only want to remove PLACEHOLDERS.
                
                // Refined Logic: Remove entries that look like "Blok X - Y" IF there are other valid entries.
            }

            // Simple Logic: Delete records where name LIKE 'Blok % - %' if there are other records
            const placeholders = residents.filter(r => r.nama.match(/^Blok\s+[A-Z0-9]+\s+-\s+[0-9]+$/i));
            const realNames = residents.filter(r => !r.nama.match(/^Blok\s+[A-Z0-9]+\s+-\s+[0-9]+$/i));

            if (placeholders.length > 0 && realNames.length > 0) {
                // We have real names, so we can delete the placeholders
                const idsToDelete = placeholders.map(p => p.id);
                console.log(` -> Deleting placeholders IDs: ${idsToDelete.join(', ')}`);
                await connection.query("DELETE FROM warga WHERE id IN (?)", [idsToDelete]);
            } else if (placeholders.length > 1 && realNames.length === 0) {
                 // Multiple placeholders? Keep one, delete others.
                 const idsToDelete = placeholders.slice(1).map(p => p.id); // Keep first
                 console.log(` -> Deleting duplicate placeholders IDs: ${idsToDelete.join(', ')}`);
                 await connection.query("DELETE FROM warga WHERE id IN (?)", [idsToDelete]);
            } else {
                console.log(" -> No obvious placeholders to delete or mixed family data. Skipping safety check.");
            }
        }

        console.log('\nCleanup Done!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

cleanup();
