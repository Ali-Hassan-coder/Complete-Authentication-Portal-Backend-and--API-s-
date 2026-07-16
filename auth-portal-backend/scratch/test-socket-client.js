const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Successfully connected to socket server!');
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('Timeout connecting to socket server.');
    process.exit(1);
}, 5000);
