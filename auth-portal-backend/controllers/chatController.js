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

const acceptEscalation = async (req, res) => {
    try {
        const { userId, userQuery } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }
        
        const io = req.app.get('io');
        const response = await chatService.acceptEscalation(req.user.id, userId, userQuery, io);
        return res.status(200).json(response);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const rejectEscalation = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }
        
        const io = req.app.get('io');
        // We do not need a DB change just for rejecting an alert, we simply emit an event back to the user
        if (io) {
            io.to(`user_${userId}`).emit('escalation_rejected', {
                message: "Our live agents are currently busy assisting other users. Please try again later or leave a message."
            });
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { handleChatMessage, acceptEscalation, rejectEscalation };
