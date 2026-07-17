const authService = require('../services/authService');

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
    const result = await authService.uploadFile(req.user.id, req.file, req.fileCategory, baseUrl);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const listUploadedFiles = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await authService.listUploadedFiles(baseUrl);
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
    const result = await authService.getAllUsers();
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
    notifySystemChange(req.app, `User role modified: User ID ${req.params.id} updated to ${req.body.role} by Admin.`);
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
    notifySystemChange(req.app, `Password changed: User ID ${req.user.id} updated their password.`);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Receiver ID and content are required' });
    }

    const { sequelize, User } = require('../models');
    
    // Check if sender is offline
    const sender = await User.findByPk(senderId);
    if (sender && sender.status === 'offline') {
      return res.status(403).json({ success: false, message: 'You cannot send messages while appearing offline.' });
    }

    const [result] = await sequelize.query(`
      INSERT INTO "messages" ("sender_id", "receiver_id", "content", "created_at", "updated_at")
      VALUES (:senderId, :receiverId, :content, NOW(), NOW())
      RETURNING *;
    `, {
      replacements: { senderId, receiverId: Number(receiverId), content },
      type: sequelize.QueryTypes.INSERT
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${Number(receiverId)}`).emit('new_message', {
        id: result[0].id,
        sender_id: senderId,
        receiver_id: Number(receiverId),
        content,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at
      });
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully', data: result[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const targetId = Number(req.params.userId);

    const { sequelize } = require('../models');
    const results = await sequelize.query(`
      SELECT * FROM "messages"
      WHERE ("sender_id" = :myId AND "receiver_id" = :targetId)
         OR ("sender_id" = :targetId AND "receiver_id" = :myId)
      ORDER BY "created_at" ASC;
    `, {
      replacements: { myId, targetId },
      type: sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
const getChatUsers = async (req, res) => {
  try {
    const myId = req.user.id;
    const { sequelize } = require('../models');
    const users = await sequelize.query(`
      SELECT u.id, u.name, u.email, u.role, u.status,
        (SELECT MAX(created_at) FROM "messages" 
         WHERE ("sender_id" = :myId AND "receiver_id" = u.id) 
            OR ("sender_id" = u.id AND "receiver_id" = :myId)
        ) AS "lastMessageAt",
        (SELECT COUNT(*) FROM "messages"
         WHERE "sender_id" = u.id AND "receiver_id" = :myId AND "is_read" = false
        ) AS "unreadCount"
      FROM "users" u
      ORDER BY "lastMessageAt" DESC NULLS LAST, u.name ASC;
    `, {
      replacements: { myId },
      type: sequelize.QueryTypes.SELECT
    });
    return res.status(200).json({ success: true, data: users });
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
    const myId = req.user.id;
    const senderId = Number(req.params.senderId);
    
    const { sequelize } = require('../models');
    await sequelize.query(`
      UPDATE "messages" SET "is_read" = true 
      WHERE "sender_id" = :senderId AND "receiver_id" = :myId AND "is_read" = false;
    `, {
      replacements: { myId, senderId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    return res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const myId = req.user.id;
    const { sequelize } = require('../models');
    const [result] = await sequelize.query(`
      SELECT COUNT(*) AS "totalUnread" FROM "messages"
      WHERE "receiver_id" = :myId AND "sender_id" != :myId AND "is_read" = false;
    `, {
      replacements: { myId },
      type: sequelize.QueryTypes.SELECT
    });
    
    return res.status(200).json({ success: true, count: parseInt(result.totalUnread || 0, 10) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { signup, login, forgotPassword, verifyOtp, resetPassword, getProfile, updateProfile, uploadFile, getAllUsers, deleteUser, updateUserRole, getUserById, updateUserById, refresh, listUploadedFiles, exportUsers, changePassword, sendMessage, getMessages, getChatUsers, updateStatus, markMessagesAsRead, getUnreadCount };
