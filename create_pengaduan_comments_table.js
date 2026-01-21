require('dotenv').config();
const db = require('./config/db');

async function createPengaduanCommentsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS pengaduan_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pengaduan_id INT NOT NULL,
                user_id INT,
                parent_id INT,
                konten TEXT NOT NULL,
                type ENUM('comment', 'log') DEFAULT 'comment',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pengaduan_id) REFERENCES pengaduan(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (parent_id) REFERENCES pengaduan_comments(id) ON DELETE CASCADE
            )
        `);
        console.log('Table pengaduan_comments created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createPengaduanCommentsTable();
