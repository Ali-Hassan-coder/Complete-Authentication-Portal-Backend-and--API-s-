const axios = require('axios');
const FormData = require('form-data');

const transcribeAudio = async (fileBuffer, originalName) => {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: originalName || 'audio.webm',
            contentType: 'audio/webm'
        });
        formData.append('model_id', 'scribe_v2');

        const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
            headers: {
                ...formData.getHeaders(),
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            }
        });

        return {
            success: true,
            text: response.data.text
        };
    } catch (err) {
        throw new Error('ElevenLabs STT Error: ' + (err.response?.data?.detail?.message || err.message));
    }
};

module.exports = { transcribeAudio };
