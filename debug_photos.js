const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to DB...', process.env.DB_HOST);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected. Querying ronda_jadwal...');
        // Join warga to get names
        const [rows] = await connection.query(`
            SELECT r.id, w.nama, r.foto_bukti 
            FROM ronda_jadwal r 
            JOIN warga w ON r.warga_id = w.id
            WHERE r.foto_bukti IS NOT NULL AND r.foto_bukti != ''
        `);
        console.log(`Found ${rows.length} rows with foto_bukti.`);
        rows.forEach(r => {
            console.log(`ID: ${r.id}, Nama: ${r.nama}, Foto: ${r.foto_bukti}`);
        });

        console.log('Querying ronda_dokumentasi...');
        const [docs] = await connection.query("SELECT * FROM ronda_dokumentasi");
        console.log(`Found ${docs.length} docs.`);
        docs.forEach(d => {
            console.log(`Date: ${d.tanggal}, Foto: ${d.foto}`);
        });

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
run();
