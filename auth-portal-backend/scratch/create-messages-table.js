const { sequelize } = require('../models');

async function main() {
    console.log("Creating messages table in database...");
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "messages" (
                "id" SERIAL PRIMARY KEY,
                "sender_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "receiver_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "content" TEXT NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);
        console.log("Success! Messages table is created.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to create messages table:", err.message);
        process.exit(1);
    }
}

main();
