const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255);`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);`);
    console.log("Migration successful: Added attachment columns to messages.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}
run();
