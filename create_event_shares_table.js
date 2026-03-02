const db = require('./config/db');

async function createEventSharesTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS event_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT,
                image_filename VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES agenda(id) ON DELETE SET NULL
            )
        `);
        console.log('Table event_shares created successfully');
        process.exit();
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createEventSharesTable();
