require('dotenv').config();
const mysql = require('mysql2/promise');
async function test() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await conn.query('SELECT * FROM warga');
        console.log('DATA_START');
        console.log(JSON.stringify(rows));
        console.log('DATA_END');
    } catch (e) {
        console.log('ERROR_START');
        console.log(e.message);
        console.log('ERROR_END');
    } finally {
        if (conn) await conn.end();
    }
}
test();
