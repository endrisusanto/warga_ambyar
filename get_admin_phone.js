const db = require('./config/db');

async function getAdminPhone() {
    try {
        const [rows] = await db.query(`
            SELECT u.username, u.role, w.no_hp 
            FROM users u 
            JOIN warga w ON u.warga_id = w.id 
            WHERE u.username = 'endrisusanto' OR u.role = 'admin'
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getAdminPhone();
