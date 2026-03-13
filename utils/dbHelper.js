const pool = require('../config/db');

/**
 * Wait for the database pool to be ready by attempting to acquire a connection.
 * @param {number} maxRetries Maximum number of retries
 * @param {number} interval Interval between retries in ms
 * @returns {Promise<boolean>} Resolves to true if ready, false if failed after maxRetries
 */
const waitForDatabase = async (maxRetries = 30, interval = 2000) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const connection = await pool.getConnection();
            connection.release();
            console.log('✅ Database is ready for migrations.');
            return true;
        } catch (err) {
            retries++;
            console.log(`⏳ Database not ready (attempt ${retries}/${maxRetries}): ${err.message}. Retrying in ${interval / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    console.error('❌ Database failed to become ready after multiple attempts.');
    return false;
};

module.exports = { waitForDatabase };
