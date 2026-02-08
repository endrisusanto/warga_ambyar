const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Override DB_HOST for local execution
const dbConfig = {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    dataset: true,
    timezone: '+07:00'
};

async function runSQL(connection, filename) {
    console.log(`Reading ${filename}...`);
    const sqlOriginal = fs.readFileSync(filename, 'utf8');
    
    // Split by semicolon but ignore semicolons inside quotes if possible, 
    // or just use a simple split for this specific file structure
    const statements = sqlOriginal.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
        if (!statement.trim()) continue;
        try {
            await connection.query(statement);
            console.log(`Executed statement: ${statement.substring(0, 50)}...`);
        } catch (err) {
            console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
            console.error(err.message);
            // Don't exit on error, some might fail (e.g. column exists)
        }
    }
}

async function main() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Check if ronda_jadwal exists
        const [rows] = await connection.query("SHOW TABLES LIKE 'ronda_jadwal'");
        if (rows.length === 0) {
            console.log('Table ronda_jadwal missing. Running fix_ronda_schema.sql...');
            await runSQL(connection, 'fix_ronda_schema.sql');
        } else {
            console.log('Table ronda_jadwal exists.');
        }

        // 2. Check if columns blok and nomor_rumah exist
        const [columns] = await connection.query("DESCRIBE ronda_jadwal");
        const hasBlok = columns.some(c => c.Field === 'blok');
        
        if (!hasBlok) {
            console.log('Columns blok/nomor_rumah missing. Running migrations/add_house_to_ronda_jadwal.sql...');
            await runSQL(connection, 'migrations/add_house_to_ronda_jadwal.sql');
        } else {
            console.log('Columns blok and nomor_rumah already exist.');
        }

        console.log('Done.');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

main();
