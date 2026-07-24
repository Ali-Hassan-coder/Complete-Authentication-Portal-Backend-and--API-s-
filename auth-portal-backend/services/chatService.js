const { Groq } = require('groq-sdk');
const { getChatInstructions } = require('../utils/chatInstructions');
const { User, sequelize } = require('../models');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const generateChatResponse = async (messages, userProfile) => {
    const formattedMessages = [
        { role: 'system', content: getChatInstructions(userProfile, userProfile.organizationName) },
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
            WHERE a."role" = :role 
              AND a."status" = 'online' 
              AND a."id" != :myId
              AND (a."organization_id" = :orgId OR :orgId IS NULL)
            GROUP BY a.id, a.name, a.role
            ORDER BY assigned_count ASC
            LIMIT 1;
        `, {
            replacements: { role, myId: userId, orgId: userProfile.organizationId || null },
            type: sequelize.QueryTypes.SELECT
        });
        
        if (agents.length > 0 && Number(agents[0].assigned_count) < MAX_CAPACITY) {
            return agents[0];
        }
        return null;
    };

    let isEscalated = false;
    let escalationTier = null;
    let chatResponse = null;
    let matchedBaseReply = null;
    const latestMessage = messages[messages.length - 1];

    // AUTOKEYWORD AUTO-REPLY LOGIC
    // We check for these keywords and return a canned response immediately, saving AI tokens and preventing unnecessary escalation.
    if (latestMessage && latestMessage.role === 'user') {
        const userText = latestMessage.content.toLowerCase();
        const autoKeywordResponses = {
            'role': 'You can view your assigned role in your Profile settings. Admins can update roles from the Dashboard.',
            'permissions': 'You can view your permission overrides in your Profile. Global permissions are managed by Admins in the Permissions CRUD.',
            'password': 'You can reset your password from the account settings page.',
            'contact': 'You can reach us at contact@ourportal.com.'
        };

        for (const [keyword, reply] of Object.entries(autoKeywordResponses)) {
            if (userText.includes(keyword)) {
                return {
                    success: true,
                    reply: reply,
                    escalated: false
                };
            }
        }
    }

    // Generate response using Groq (AI will intelligently decide to escalate based on content + priority tag)
    chatResponse = await generateChatResponse(messages, userProfile);
    
    const replyText = (chatResponse.reply || '').toUpperCase();
    if (replyText.includes('[ESCALATE_ADMIN]')) {
        isEscalated = true;
        escalationTier = 'admin';
    } else if (replyText.includes('[ESCALATE_MODERATOR]') || replyText.includes('[TRIGGER_HUMAN_ESCALATION]')) {
        isEscalated = true;
        escalationTier = 'moderator';
    }

    if (isEscalated) {
        let availableAgent = null;

        if (escalationTier === 'admin') {
            availableAgent = await findAgent('admin');
            if (!availableAgent) {
                // Fallback to moderator
                availableAgent = await findAgent('moderator');
            }
        } else {
            // Moderator tier
            availableAgent = await findAgent('moderator');
            if (!availableAgent) {
                // Fallback to admin
                availableAgent = await findAgent('admin');
            }
        }

        if (!availableAgent) {
            const offlinePrefix = matchedBaseReply ? `${matchedBaseReply} ` : '';
            return {
                success: true,
                reply: `${offlinePrefix}All our human agents are currently assisting other users or are offline. Your critical request has been logged, and we will get back to you shortly.`,
                escalated: false // They can't escalate if no one is there
            };
        }

        if (io) {
            io.to(`user_${availableAgent.id}`).emit('escalation_alert', {
                userId: userId,
                userName: userProfile.name,
                message: `User query requires human support [Priority: ${escalationTier.toUpperCase()}]. Click Join Chat to accept.`,
                userQuery: latestMessage?.content || "No specific query provided"
            });
        }

        return {
            success: true,
            reply: `I have notified our live support agents. Please wait while an agent accepts your request...`,
            escalated: true
        };
    }

    return chatResponse;
};

const acceptEscalation = async (agentId, targetUserId, userQuery, io) => {
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) throw new Error('User not found.');
    
    if (targetUser.assignedAgentId) {
        throw new Error('User has already been assigned to an agent.');
    }

    const agent = await User.findByPk(agentId);

    // Execute actual transfer
    await User.update(
        { assignedAgentId: agent.id },
        { where: { id: targetUserId } }
    );

    const messageService = require('./messageService');
    try {
        const fwdMessage = userQuery 
            ? `System Forwarded Query: "${userQuery}"`
            : `System: User has been assigned to you.`;
        await messageService.sendMessage(targetUserId, agent.id, fwdMessage, null, null, io);
    } catch (e) {
        console.error("Failed to send escalation message", e);
    }

    if (io) {
        io.to(`user_${targetUserId}`).emit('escalation_assigned', {
            agentId: agent.id,
            agentName: agent.name
        });
    }
    return { success: true, message: 'Chat successfully transferred to you.' };
};

module.exports = { generateChatResponse, processChatMessage, acceptEscalation };
