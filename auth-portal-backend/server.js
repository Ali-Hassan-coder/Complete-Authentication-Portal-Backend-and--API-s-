const loadEnv = require('./config/env');
loadEnv();

console.log('Starting server.js');
const app = require('./app');
console.log('Loaded app');

const http = require('http');
const initSocket = require('./config/socket');
const connectDB = require('./config/dbConnection');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server, app);

// Connect to Database and start server
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});