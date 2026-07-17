const pool = require('./db');

const connectDB = async () => {
    try {
        console.log('Attempting to connect to PostgreSQL...');
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL database', err);
        process.exit(1);
    }
};

module.exports = connectDB;
