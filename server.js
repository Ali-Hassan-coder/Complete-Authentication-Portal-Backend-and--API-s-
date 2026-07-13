const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const dotenvResult = dotenv.config();
if (!dotenvResult.parsed || Object.keys(dotenvResult.parsed).length === 0 || !process.env.DB_PASSWORD) {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
        Object.keys(parsed).forEach((k) => {
            if (!process.env[k]) process.env[k] = parsed[k];
        });
        console.log('Explicitly loaded .env from', envPath);
    } else {
        console.warn('.env file not found at', envPath);
    }
}

console.log('Starting server.js');
const app = require('./app');
console.log('Loaded app');
const pool = require('./config/db');
console.log('DB pool loaded');

const PORT = process.env.PORT || 3000;

console.log('Attempting to connect to PostgreSQL...');
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database');
        client.release();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database', err);
        process.exit(1);
    });