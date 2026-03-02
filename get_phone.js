const db = require('./config/db');

async function getAdminPhone() {
    try {
        const [rows] = await db.query(`
            SELECT w.no_hp 
            FROM users u 
            JOIN warga w ON u.warga_id = w.id 
            WHERE u.username = 'endrisusanto'
        `);
        if (rows.length > 0) {
            console.log('PHONE:' + rows[0].no_hp);
        } else {
            console.log('PHONE:NOT_FOUND');
        }
        process.exit(0);
    } catch (err) {
        console.log('ERROR:' + err.message);
        process.exit(1);
    }
}

getAdminPhone();
