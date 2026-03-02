const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    const sql = fs.readFileSync(path.join(__dirname, 'schema_ronda_dokumentasi.sql'), 'utf8');
    await connection.query(sql);
    console.log('Schema ronda_dokumentasi created');
    process.exit();
}

run().catch(console.error);
