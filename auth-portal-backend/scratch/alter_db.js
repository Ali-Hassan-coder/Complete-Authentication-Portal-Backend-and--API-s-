const { sequelize } = require('../models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE users ADD COLUMN assigned_agent_id INTEGER;');
    console.log('Successfully added assigned_agent_id to users table');
  } catch (error) {
    console.error('Error adding column (it might already exist):', error.message);
  } finally {
    process.exit(0);
  }
}

run();
