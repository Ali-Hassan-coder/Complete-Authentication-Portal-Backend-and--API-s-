const notifySystemChange = (app, message) => {
    const io = app.get('io');
    if (io) {
        io.emit('system_notification', {
            id: Date.now(),
            message,
            timestamp: new Date().toLocaleString()
        });
    }
};

module.exports = { notifySystemChange };
