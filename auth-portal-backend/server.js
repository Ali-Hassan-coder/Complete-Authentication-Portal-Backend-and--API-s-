const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const dotenvResult = dotenv.config();
if (!dotenvResult.parsed || Object.keys(dotenvResult.parsed).length === 0 || !process.env.DB_PASSWORD) {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
        Object.keys(parsed).forEach((k) => {
            if (!process.env[k]) process.env[k] = parsed[k];
        });
        console.log('Explicitly loaded .env from', envPath);
    } else {
        console.warn('.env file not found at', envPath);
    }
}

console.log('Starting server.js');
const app = require('./app');
console.log('Loaded app');
const pool = require('./config/db');
console.log('DB pool loaded');

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

console.log('Attempting to connect to PostgreSQL...');
pool.connect()
    .then(client => {
        console.log('Connected to PostgreSQL database');
        client.release();
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL database', err);
        process.exit(1);
    });