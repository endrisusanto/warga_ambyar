const db = require('./config/db');

async function checkSchema() {
    try {
        const [wargaColumns] = await db.query('SHOW COLUMNS FROM warga');
        console.log('--- Warga Table Columns ---');
        console.table(wargaColumns);

        const [usersColumns] = await db.query('SHOW COLUMNS FROM users');
        console.log('--- Users Table Columns ---');
        console.table(usersColumns);

        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
