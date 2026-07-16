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
            const io = req.app.get('io');
            if (io) {
                io.emit('escalation_alert', {
                    userId: req.user.id,
                    userName: userProfile.name,
                    message: "User query is out of scope and requires a live agent."
                });
            }
            return res.status(200).json({
                success: true,
                reply: "I am sorry, but that request is outside my boundaries. I am transferring you to a live support agent right now. Please wait...",
                escalated: true
            });
        }

        return res.status(200).json(chatResponse);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { handleChatMessage };
