const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Maps mimetype prefixes/extensions to a classification folder
const classifyFile = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    if (
        mimetype === 'application/pdf' ||
        mimetype === 'application/msword' ||
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/vnd.ms-excel' ||
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'text/plain'
    ) return 'documents';
    return 'others';
};

const PUBLIC_ROOT = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = classifyFile(file.mimetype);
        const destPath = path.join(PUBLIC_ROOT, folder);

        // Auto-create the folder (and any parent folders) if it doesn't exist
        fs.mkdirSync(destPath, { recursive: true });

        // Attach classification to request so the controller can use it later
        req.fileCategory = folder;

        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const safeName = `${uniqueSuffix}${ext}`;
        cb(null, safeName);
    }
});

// Optional: restrict file types and size (10MB limit here, adjust as needed)
const ALLOWED_MIMETYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = upload;