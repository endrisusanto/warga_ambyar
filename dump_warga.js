require('dotenv').config();
const mysql = require('mysql2/promise');
async function dump() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('Connected to:', process.env.DB_NAME);
        const [rows] = await connection.query('SELECT id, nama, blok, nomor_rumah, status_huni FROM warga');
        console.log('Found', rows.length, 'warga');
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
dump();
