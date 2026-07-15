const { Pool } = require('pg');

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let parsedEnv = {};
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    try {
        const stat = fs.statSync(envPath);
        // .env file exists; size: stat.size
    } catch (e) {
        // ignore
    }
    try {
        parsedEnv = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
    } catch (e) {
        // ignore
    }
}

let rawPwd = process.env.DB_PASSWORD || parsedEnv.DB_PASSWORD || '';
if (rawPwd && typeof rawPwd !== 'string' && rawPwd.toString) rawPwd = rawPwd.toString();
rawPwd = String(rawPwd || '');
// Remove BOM and zero-width spaces, then trim
rawPwd = rawPwd.replace(/^[\uFEFF\u200B]+/, '').trim();

const dbConfig = {
    user: process.env.DB_USER || parsedEnv.DB_USER,
    host: process.env.DB_HOST || parsedEnv.DB_HOST,
    database: process.env.DB_NAME || parsedEnv.DB_NAME,
    password: rawPwd.length ? rawPwd : undefined,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : parsedEnv.DB_PORT ? parseInt(parsedEnv.DB_PORT, 10) : 5432,
};

if (!dbConfig.password) {
    console.error('Database password is missing or empty. Please set DB_PASSWORD in your .env (save without BOM, UTF-8 encoding).');
    process.exit(1);
}

const pool = new Pool(dbConfig);

module.exports = pool;