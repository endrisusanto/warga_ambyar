const db = require('./config/db');
require('dotenv').config();

// Debugging connection params
console.log('Connecting to DB Host:', process.env.DB_HOST);
console.log('Database Name:', process.env.DB_NAME);

async function checkData() {
    try {
        console.log('Checking activity_logs table...');
        const [rows] = await db.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5');
        console.log('Row count:', rows.length);
        if (rows.length > 0) {
            console.log('First row:', rows[0]);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit();
}

checkData();
