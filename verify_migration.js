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

        // Verify ronda_jadwal
        const [rows] = await connection.query("SHOW TABLES LIKE 'ronda_jadwal'");
        if (rows.length === 0) {
            console.error('ERROR: Table ronda_jadwal still MISSING!');
            process.exit(1);
        }
        console.log('Table ronda_jadwal found.');

        const [columns] = await connection.query("DESCRIBE ronda_jadwal");
        const hasBlok = columns.some(c => c.Field === 'blok');
        const hasNomorRumah = columns.some(c => c.Field === 'nomor_rumah');

        if (hasBlok && hasNomorRumah) {
            console.log('SUCCESS: Columns blok and nomor_rumah EXIST.');
        } else {
            console.error('ERROR: Columns blok/nomor_rumah MISSING!');
            process.exit(1);
        }

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

main();
