const chatService = require('../services/chatService');
const authService = require('../services/authService');

const handleChatMessage = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, message: 'Messages array is required.' });
        }

        // Fetch full profile details (including role mappings and permissions overrides)
        const profileResult = await authService.getProfile(req.user.id);
        const userProfile = profileResult.data;

        // Generate response using Groq
        const chatResponse = await chatService.generateChatResponse(messages, userProfile);

        const isEscalated = chatResponse.reply && (
            chatResponse.reply.includes('[TRIGGER_HUMAN_ESCALATION]') ||
            chatResponse.reply.toLowerCase().includes('trigger_human_escalation')
        );

        if (isEscalated) {
            const { User, sequelize } = require('../models');
            
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
                    replacements: { role, myId: req.user.id },
                    type: sequelize.QueryTypes.SELECT
                });
                
                if (agents.length > 0 && Number(agents[0].assigned_count) < MAX_CAPACITY) {
                    return agents[0];
                }
                return null;
            };

            let availableAgent = await findAgent('moderator');
            
            if (!availableAgent) {
                availableAgent = await findAgent('admin');
            }

            if (!availableAgent) {
                return res.status(200).json({
                    success: true,
                    reply: "I am sorry, but all our live support agents are currently busy assisting other users. Please check back later.",
                    escalated: false
                });
            }

            // Assign the user to this agent
            await User.update(
                { assignedAgentId: availableAgent.id },
                { where: { id: req.user.id } }
            );

            const io = req.app.get('io');
            if (io) {
                // Emit only to the specific agent
                io.to(`user_${availableAgent.id}`).emit('escalation_alert', {
                    userId: req.user.id,
                    userName: userProfile.name,
                    message: "User query is out of scope. They have been assigned to you."
                });
                
                // Let the frontend know we are escalated to refresh chat users if needed
                io.to(`user_${req.user.id}`).emit('escalation_assigned', {
                    agentId: availableAgent.id,
                    agentName: availableAgent.name
                });
            }
            return res.status(200).json({
                success: true,
                reply: `I am transferring you to a live support agent right now. You are connected to ${availableAgent.name}. Please wait...`,
                escalated: true
            });
        }

        return res.status(200).json(chatResponse);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { handleChatMessage };
