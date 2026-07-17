const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const loadEnv = () => {
    const dotenvResult = dotenv.config();
    if (!dotenvResult.parsed || Object.keys(dotenvResult.parsed).length === 0 || !process.env.DB_PASSWORD) {
        const envPath = path.resolve(__dirname, '..', '.env');
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
};

module.exports = loadEnv;
