const request = require('supertest');
const express = require('express');
const upload = require('../uploadMiddleware');

// Create a dummy Express app purely for testing the Multer middleware
const app = express();
app.post('/upload', upload.single('file'), (req, res) => {
    // If successful, Multer attaches the file to req.file
    res.status(200).json({ success: true, message: 'File accepted' });
});

// Catch Multer errors (like file type rejection)
app.use((err, req, res, next) => {
    res.status(400).json({ success: false, message: err.message });
});

describe('File Upload Middleware Tests', () => {

    it('should allow a valid image file (e.g. image/png)', async () => {
        // We simulate uploading a file using supertest's .attach()
        // We pass a buffer representing a dummy image file.
        const res = await request(app)
            .post('/upload')
            .attach('file', Buffer.from('fake-image-content'), { filename: 'test.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File accepted');
    });

    it('should allow a valid document file (e.g. application/pdf)', async () => {
        const res = await request(app)
            .post('/upload')
            .attach('file', Buffer.from('fake-pdf-content'), { filename: 'doc.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File accepted');
    });

    it('should reject unsupported file types like executable (.exe) files', async () => {
        const res = await request(app)
            .post('/upload')
            .attach('file', Buffer.from('fake-exe-content'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });

        // The middleware's fileFilter should throw an error, which our error handler catches as 400
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Unsupported file type');
    });

    it('should reject zip files (application/zip)', async () => {
        const res = await request(app)
            .post('/upload')
            .attach('file', Buffer.from('fake-zip-content'), { filename: 'archive.zip', contentType: 'application/zip' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Unsupported file type');
    });

});
