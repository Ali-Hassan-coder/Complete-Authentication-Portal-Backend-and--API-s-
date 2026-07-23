const { Groq } = require('groq-sdk');
const { getChatInstructions } = require('../utils/chatInstructions');
const { User, sequelize } = require('../models');

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

const processChatMessage = async (messages, userProfile, userId, io) => {
    const MAX_CAPACITY = 3;

    // Helper function to find least busy agent for a specific role
    const findAgent = async (role) => {
        const agents = await sequelize.query(`
            SELECT a.id, a.name, a.role, COUNT(u.id) as assigned_count
            FROM "users" a
            LEFT JOIN "users" u ON u."assigned_agent_id" = a.id
            WHERE a."role" = :role AND a."status" = 'online' AND a."id" != :myId
            GROUP BY a.id, a.name, a.role
            ORDER BY assigned_count ASC
            LIMIT 1;
        `, {
            replacements: { role, myId: userId },
            type: sequelize.QueryTypes.SELECT
        });
        
        if (agents.length > 0 && Number(agents[0].assigned_count) < MAX_CAPACITY) {
            return agents[0];
        }
        return null;
    };

    // KEYWORD DETECTION LOGIC
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'user') {
        const userText = latestMessage.content.toLowerCase();
        
        const keywordResponses = {
            'pricing': 'You can view our pricing plans at /pricing.',
            'password': 'You can reset your password from the account settings page.',
            'help': 'If you need help, our team is here for you.',
            'contact': 'You can reach us at contact@ourportal.com.'
        };

        let matchedBaseReply = null;
        for (const [keyword, reply] of Object.entries(keywordResponses)) {
            if (userText.includes(keyword)) {
                matchedBaseReply = reply;
                break;
            }
        }

        if (matchedBaseReply) {
            let availableAgent = await findAgent('moderator');
            if (!availableAgent) availableAgent = await findAgent('admin');

            let finalReply = matchedBaseReply;
            if (availableAgent) {
                finalReply += ` I see an agent is currently online. Let me know if you want me to transfer you to them!`;
            } else {
                finalReply += ` Our human agents are currently offline, but you can leave a message and they will get back to you soon.`;
            }
            
            return {
                success: true,
                reply: finalReply,
                escalated: false
            };
        }
    }

    // Generate response using Groq
    const chatResponse = await generateChatResponse(messages, userProfile);

    const isEscalated = chatResponse.reply && (
        chatResponse.reply.includes('[TRIGGER_HUMAN_ESCALATION]') ||
        chatResponse.reply.toLowerCase().includes('trigger_human_escalation')
    );

    if (isEscalated) {
        let availableAgent = await findAgent('moderator');
        
        if (!availableAgent) {
            availableAgent = await findAgent('admin');
        }

        if (!availableAgent) {
            return {
                success: true,
                reply: "I am sorry, but all our live support agents are currently busy assisting other users. Please check back later.",
                escalated: false
            };
        }

        // Assign the user to this agent
        await User.update(
            { assignedAgentId: availableAgent.id },
            { where: { id: userId } }
        );

        if (io) {
            // Emit only to the specific agent
            io.to(`user_${availableAgent.id}`).emit('escalation_alert', {
                userId: userId,
                userName: userProfile.name,
                message: "User query is out of scope. They have been assigned to you."
            });
            
            // Let the frontend know we are escalated to refresh chat users if needed
            io.to(`user_${userId}`).emit('escalation_assigned', {
                agentId: availableAgent.id,
                agentName: availableAgent.name
            });
        }
        return {
            success: true,
            reply: `I am transferring you to a live support agent right now. You are connected to ${availableAgent.name}. Please wait...`,
            escalated: true
        };
    }

    return chatResponse;
};

module.exports = { generateChatResponse, processChatMessage };
