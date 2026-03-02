const fs = require('fs');
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

async function runSQL(connection, filename) {
    console.log(`Reading ${filename}...`);
     const sqlOriginal = fs.readFileSync(filename, 'utf8');
    
    // Split by semicolon 
    const statements = sqlOriginal.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
        if (!statement.trim()) continue;
        try {
            await connection.query(statement);
            console.log(`Executed: ${statement.substring(0, 30)}...`);
        } catch (err) {
            // Ignore "Duplicate column name" error
            if (err.code === 'ER_DUP_FIELDNAME') {
                 console.log(`Skipping duplicate column: ${statement.substring(0, 30)}...`);
            } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                 console.log(`Skipping existing table: ${statement.substring(0, 30)}...`);
            } else {
                 console.error(`Error executing: ${statement.substring(0, 50)}...`);
                 console.error(err.message);
            }
        }
    }
}

async function main() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');
        
        await runSQL(connection, 'migrations/add_monitoring_schema.sql');
        
        console.log('Migration completed.');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

main();
