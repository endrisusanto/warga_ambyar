const mysql = require('mysql2/promise');

const resetRondaData = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'rootpassword',
            database: 'rt_rw_db',
            port: 3306
        });

        console.log('Resetting Ronda Data...');

        // Truncate tables
        await connection.query('TRUNCATE TABLE ronda_jadwal');
        console.log('✅ ronda_jadwal truncated.');

        await connection.query('TRUNCATE TABLE ronda_dokumentasi');
        console.log('✅ ronda_dokumentasi truncated.');
        
        await connection.query('TRUNCATE TABLE ronda_shares');
        console.log('✅ ronda_shares truncated.');

        console.log('Ronda data reset successfully.');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error resetting ronda data:', error);
        process.exit(1);
    }
};

resetRondaData();
