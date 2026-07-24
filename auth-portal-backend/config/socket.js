const { Server } = require('socket.io');

const authService = require('../services/authService');

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

        socket.on('join', (data) => {
            const userId = typeof data === 'object' ? data.userId : data;
            const organizationId = typeof data === 'object' ? data.organizationId : null;
            
            socket.userId = userId;
            socket.join(`user_${userId}`);
            console.log(`Socket ${socket.id} joined room user_${userId}`);
            
            if (organizationId) {
                socket.join(`org_${organizationId}`);
                console.log(`Socket ${socket.id} joined room org_${organizationId}`);
            }
        });

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);
            if (socket.userId) {
                try {
                    await authService.updateStatus(socket.userId, 'offline');
                    io.emit('user_status_changed', { userId: socket.userId, status: 'offline' });
                } catch (err) {
                    console.error(`Failed to set user ${socket.userId} offline on disconnect:`, err.message);
                }
            }
        });
    });

    return io;
};

module.exports = initSocket;
