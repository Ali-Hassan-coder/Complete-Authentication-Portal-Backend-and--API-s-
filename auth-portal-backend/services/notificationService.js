const notifySystemChange = (app, message, organizationId = null) => {
    const io = app.get('io');
    if (io) {
        const payload = {
            id: Date.now(),
            message,
            timestamp: new Date().toLocaleString()
        };
        
        if (organizationId) {
            io.to(`org_${organizationId}`).emit('system_notification', payload);
        } else {
            io.emit('system_notification', payload);
        }
    }
};

module.exports = { notifySystemChange };
