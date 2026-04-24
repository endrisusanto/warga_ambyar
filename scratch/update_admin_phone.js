const db = require('../config/db');

async function updateAdminPhone() {
    try {
        const newPhone = '6285176970180';
        
        // Update user 'endrisusanto'
        const [result] = await db.query(`
            UPDATE warga w
            JOIN users u ON u.warga_id = w.id
            SET w.no_hp = ?
            WHERE u.username = 'endrisusanto'
        `, [newPhone]);
        
        console.log('Update result:', result.affectedRows, 'row(s) updated.');
        
        if (result.affectedRows === 0) {
            console.log('User endrisusanto not found or already has this number.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error updating database:', err);
        process.exit(1);
    }
}

updateAdminPhone();
