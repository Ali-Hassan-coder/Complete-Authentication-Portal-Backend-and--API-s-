const { Server } = require('socket.io');

const initSocket = (server, app) => {
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

    return io;
};

module.exports = initSocket;
