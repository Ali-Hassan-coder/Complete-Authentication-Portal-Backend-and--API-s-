require('dotenv').config();
const { Groq } = require('groq-sdk');

console.log("API Key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const chatService = require('../services/chatService');

async function main() {
    try {
        const mockProfile = { name: "Alice", email: "alice@example.com", role: "user", permissions: [] };
        console.log("Sending out-of-scope query...");
        const result = await chatService.generateChatResponse(
            [{ role: 'user', content: 'What is the capital of France?' }], 
            mockProfile
        );
        console.log("Service response:", result);
    } catch (err) {
        console.error("Error encountered:", err.message);
    }
}

main();
