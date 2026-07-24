const authService = require('../services/authService');
const messageService = require('../services/messageService');

const signup = async (req, res) => {
  try {
    const result = await authService.signup(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    // Auto-set status to online on login
    if (result.user && result.user.id) {
      await authService.updateStatus(result.user.id, 'online');
      const io = req.app.get('io');
      if (io) {
        io.emit('user_status_changed', { userId: result.user.id, status: 'online' });
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


const updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await authService.uploadFile(req.user.id, req.file, req.fileCategory, baseUrl, req.query.purpose);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const listUploadedFiles = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await authService.listUploadedFiles(baseUrl, req.user.organizationId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const getProfile = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await authService.getProfile(req.user.id, baseUrl);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await authService.getAllUsers(req.user.organizationId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await authService.deleteUser(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const result = await authService.updateUserRole(req.params.id, req.body.role, req.user.id);
    const { notifySystemChange } = require('../services/notificationService');
    notifySystemChange(req.app, `User role modified: User ID ${req.params.id} updated to ${req.body.role} by Admin.`, req.user.organizationId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const getUserById = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await authService.getUserById(req.params.id, baseUrl);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const result = await authService.updateUserById(req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const result = await authService.refreshSession(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
};
const exportUsers = async (req, res) => {
  try {
    const { User } = require("../models");
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'role', 'created_at']
    });

    let csv = 'ID,Name,Email,Phone,Role,Joined At\n';
    users.forEach(u => {
      csv += `${u.id},"${u.name}","${u.email}","${u.phone || ''}","${u.role}","${u.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users_report.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    const { notifySystemChange } = require('../services/notificationService');
    notifySystemChange(req.app, `Password changed: User ID ${req.user.id} updated their password.`, req.user.organizationId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, attachmentUrl, attachmentType } = req.body;
    const senderId = req.user.id;
    if (!receiverId || (!content && !attachmentUrl)) {
      return res.status(400).json({ success: false, message: 'Receiver ID and content/attachment are required' });
    }
    const io = req.app.get('io');
    const message = await messageService.sendMessage(senderId, receiverId, content, attachmentUrl, attachmentType, io);
    return res.status(200).json({ success: true, message: 'Message sent successfully', data: message });
  } catch (err) {
    return res.status(err.message.includes('cannot') || err.message.includes('not assigned') ? 403 : 500).json({ success: false, message: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = Number(req.params.userId);
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const data = await messageService.getMessages(myId, targetId, limit, offset);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
const getChatUsers = async (req, res) => {
  try {
    const data = await messageService.getChatUsers(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await authService.updateStatus(req.user.id, status);

    const io = req.app.get('io');
    if (io) {
      io.emit('user_status_changed', { userId: req.user.id, status });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const io = req.app.get('io');
    await messageService.markMessagesAsRead(req.user.id, Number(req.params.senderId), io);
    return res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const data = await messageService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const purgeLogs = async (req, res) => {
  try {
    const logger = require('../utils/logger');
    logger.clearLogs();
    return res.status(200).json({ success: true, message: 'Logs purged successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const testEmailAlert = async (req, res) => {
  try {
    const logger = require('../utils/logger');
    logger.writeLog('Test Email Alert Triggered', req.user.email);

    const { sendOtpEmail } = require('../services/emailService');
    await sendOtpEmail(req.user.email, 'TEST-ALERT');

    return res.status(200).json({ success: true, message: 'Test email alert sent and logged' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const unassignUser = async (req, res) => {
  try {
    const io = req.app.get('io');
    await messageService.unassignUser(req.params.userId, req.user.id, req.user.role, io);
    return res.status(200).json({ success: true, message: 'User session closed successfully.' });
  } catch (err) {
    return res.status(err.message === 'User not found' ? 404 : (err.message.includes('unassign') ? 403 : 500)).json({ success: false, message: err.message });
  }
};

module.exports = { signup, login, forgotPassword, verifyOtp, resetPassword, getProfile, updateProfile, uploadFile, getAllUsers, deleteUser, updateUserRole, getUserById, updateUserById, refresh, listUploadedFiles, exportUsers, changePassword, sendMessage, getMessages, getChatUsers, updateStatus, markMessagesAsRead, getUnreadCount, purgeLogs, testEmailAlert, unassignUser };
