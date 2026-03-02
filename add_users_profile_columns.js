require('dotenv').config();
const db = require('./config/db');

async function addColumns() {
    try {
        await db.query("ALTER TABLE users ADD COLUMN nama VARCHAR(255) DEFAULT NULL");
        console.log("Added nama to users table");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column nama already exists");
        } else {
            console.error("Error adding nama:", e);
        }
    }

    try {
        await db.query("ALTER TABLE users ADD COLUMN foto_profil VARCHAR(255) DEFAULT NULL");
        console.log("Added foto_profil to users table");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column foto_profil already exists");
        } else {
            console.error("Error adding foto_profil:", e);
        }
    }

    process.exit(0);
}

addColumns();
