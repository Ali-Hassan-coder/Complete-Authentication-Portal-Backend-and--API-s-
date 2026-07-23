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

        const io = req.app.get('io');
        
        // Pass everything to the service layer
        const chatResponse = await chatService.processChatMessage(messages, userProfile, req.user.id, io);

        return res.status(200).json(chatResponse);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { handleChatMessage };
