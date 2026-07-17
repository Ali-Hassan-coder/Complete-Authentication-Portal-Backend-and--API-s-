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
    const userRes = await pool.query(`SELECT id, name FROM users WHERE name ILIKE '%muhammad khan%'`);
    if (userRes.rows.length > 0) {
      const myId = userRes.rows[0].id;
      console.log('User found:', userRes.rows[0]);
      const res = await pool.query(`
        SELECT sender_id, receiver_id, content, is_read 
        FROM messages 
        WHERE receiver_id = $1 AND is_read = false;
      `, [myId]);
      console.log('Unread messages:', res.rows);
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
