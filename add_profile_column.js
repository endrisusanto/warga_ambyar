require('dotenv').config();
const db = require('./config/db');

async function addColumn() {
    try {
        await db.query("ALTER TABLE warga ADD COLUMN foto_profil VARCHAR(255) DEFAULT NULL");
        console.log("Added foto_profil to warga table");
        process.exit(0);
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists");
            process.exit(0);
        }
        console.error(e);
        process.exit(1);
    }
}
addColumn();
