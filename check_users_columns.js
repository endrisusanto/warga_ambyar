const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    timezone: '+07:00'
};

async function main() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const [columns] = await connection.query("DESCRIBE users");
        const hasLastActive = columns.some(c => c.Field === 'last_active');
        const hasLastIp = columns.some(c => c.Field === 'last_ip');
        
        if (hasLastActive && hasLastIp) {
            console.log('SUCCESS: Columns last_active and last_ip EXIST in users table.');
        } else {
            console.error('ERROR: Columns last_active/last_ip MISSING in users table!');
            if (!hasLastActive) console.error(' - last_active missing');
            if (!hasLastIp) console.error(' - last_ip missing');
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

main();
