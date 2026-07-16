require('dotenv').config();
const axios = require('axios');

console.log("ElevenLabs API Key loaded:", process.env.ELEVENLABS_API_KEY ? "YES" : "NO");

function createSilentWavBuffer() {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = sampleRate * 1 * blockAlign; // 1 second
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

async function main() {
    try {
        const FormData = require('form-data');
        const audioBuffer = createSilentWavBuffer();
        const formData = new FormData();
        formData.append('file', audioBuffer, {
            filename: 'silent.wav',
            contentType: 'audio/wav'
        });
        formData.append('model_id', 'scribe_v2');

        const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
            headers: {
                ...formData.getHeaders(),
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            }
        });
        console.log("Success! Transcription text:", response.data);
    } catch (err) {
        console.error("Error encountered:", err.message);
        if (err.response) {
            console.error("Response details:", err.response.data);
        }
    }
}

main();
