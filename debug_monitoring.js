const db = require('./config/db');

async function testQuery() {
    try {
        const [rows] = await db.query('SELECT * FROM activity_logs LIMIT 1');
        console.log('Success:', rows);
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit();
}

testQuery();
