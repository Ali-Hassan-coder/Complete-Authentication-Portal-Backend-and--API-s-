const { Groq } = require('groq-sdk');
const { getChatInstructions } = require('../utils/chatInstructions');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const generateChatResponse = async (messages, userProfile) => {
    const formattedMessages = [
        { role: 'system', content: getChatInstructions(userProfile) },
        ...messages
    ];

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1024
        });

        return {
            success: true,
            reply: response.choices[0]?.message?.content || "I couldn't process that response."
        };
    } catch (err) {
        throw new Error('Groq API Error: ' + err.message);
    }
};

module.exports = { generateChatResponse };
