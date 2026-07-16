const voiceService = require('../services/voiceService');

const transcribe = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Audio file is required.' });
        }

        const result = await voiceService.transcribeAudio(req.file.buffer, req.file.originalname);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { transcribe };
