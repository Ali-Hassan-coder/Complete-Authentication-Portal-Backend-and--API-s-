const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'system_logs.txt');

const writeLog = (action, userEmail) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [USER: ${userEmail}] ACTION: ${action}\n`;
    
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error('Failed to write to system logs:', err);
    });
};

const clearLogs = () => {
    fs.writeFile(logFilePath, '', (err) => {
        if (err) console.error('Failed to clear system logs:', err);
    });
};

module.exports = {
    writeLog,
    clearLogs
};
