const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: 'rootpassword',
            database: 'rt_rw_db',
            port: 3306
        });
        const [rows] = await conn.query('SHOW COLUMNS FROM warga');
        console.log('COLUMNS_START');
        console.log(JSON.stringify(rows));
        console.log('COLUMNS_END');
    } catch (e) {
        console.log('ERROR_START');
        console.log(e.message);
        console.log('ERROR_END');
    } finally {
        if (conn) await conn.end();
    }
}
test();
