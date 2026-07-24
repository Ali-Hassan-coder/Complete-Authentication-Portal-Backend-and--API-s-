const { sequelize, User } = require('../models');

const sendMessage = async (senderId, receiverId, content, attachmentUrl, attachmentType, io) => {
    // Check if sender is offline
    const sender = await User.findByPk(senderId);
    if (sender && sender.status === 'offline') {
        throw new Error('You cannot send messages while appearing offline.');
    }
    // Assignment lock check for Call Center routing
    if (sender.role === 'user') {
        if (Number(receiverId) !== sender.assignedAgentId) {
            throw new Error('You can only message your assigned support agent.');
        }
    } else {
        // Sender is an agent/admin
        const targetUser = await User.findByPk(receiverId);
        if (targetUser && targetUser.role === 'user' && targetUser.assignedAgentId !== sender.id) {
            throw new Error('This user is not assigned to you.');
        }
        if (targetUser && targetUser.organizationId !== sender.organizationId) {
            throw new Error('You cannot message users outside of your organization.');
        }
    }
    const [result] = await sequelize.query(`
      INSERT INTO "messages" ("sender_id", "receiver_id", "content", "attachment_url", "attachment_type", "created_at", "updated_at")
      VALUES (:senderId, :receiverId, :content, :attachmentUrl, :attachmentType, NOW(), NOW())
      RETURNING *;
    `, {
        replacements: { senderId, receiverId: Number(receiverId), content: content || '', attachmentUrl: attachmentUrl || null, attachmentType: attachmentType || null },
        type: sequelize.QueryTypes.INSERT
    });

    if (io) {
        io.to(`user_${Number(receiverId)}`).emit('new_message', {
            id: result[0].id,
            sender_id: senderId,
            receiver_id: Number(receiverId),
            content: result[0].content,
            attachment_url: result[0].attachment_url,
            attachment_type: result[0].attachment_type,
            created_at: result[0].created_at,
            updated_at: result[0].updated_at
        });
    }

    return result[0];
};

const getMessages = async (myId, targetId, limit, offset) => {
    const results = await sequelize.query(`
      SELECT * FROM "messages"
      WHERE ("sender_id" = :myId AND "receiver_id" = :targetId)
         OR ("sender_id" = :targetId AND "receiver_id" = :myId)
      ORDER BY "created_at" DESC
      LIMIT :limit OFFSET :offset;
    `, {
        replacements: { myId, targetId, limit, offset },
        type: sequelize.QueryTypes.SELECT
    });

    // Reverse the results so they appear in chronological order to the frontend
    results.reverse();
    return results;
};

const getChatUsers = async (myId) => {
    // Find my profile to know my role and if I am assigned to someone
    const me = await User.findByPk(myId);
    let condition = '1=1'; // default fallback

    if (me.role === 'admin' || me.role === 'moderator') {
        // I am an agent. Show me users assigned to me AND other agents in my organization
        condition = `(u."assigned_agent_id" = :myId OR u.role IN ('admin', 'moderator')) AND u.id != :myId AND u."organization_id" = :orgId`;
    } else {
        // I am a normal user. Only show me the agent assigned to me.
        if (me.assignedAgentId) {
            condition = `u.id = ${me.assignedAgentId} AND u."organization_id" = :orgId`;
        } else {
            return [];
        }
    }

    const users = await sequelize.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.assigned_agent_id AS "assignedAgentId",
        (SELECT MAX(created_at) FROM "messages" 
         WHERE ("sender_id" = :myId AND "receiver_id" = u.id) 
            OR ("sender_id" = u.id AND "receiver_id" = :myId)
        ) AS "lastMessageAt",
        (SELECT COUNT(*) FROM "messages"
         WHERE "sender_id" = u.id AND "receiver_id" = :myId AND "is_read" = false
        ) AS "unreadCount"
      FROM "users" u
      WHERE ${condition}
      ORDER BY "lastMessageAt" DESC NULLS LAST, u.name ASC;
    `, {
        replacements: { myId, orgId: me.organizationId || null },
        type: sequelize.QueryTypes.SELECT
    });
    return users;
};

const markMessagesAsRead = async (myId, senderId, io) => {
    await sequelize.query(`
      UPDATE "messages" SET "is_read" = true 
      WHERE "sender_id" = :senderId AND "receiver_id" = :myId AND "is_read" = false;
    `, {
        replacements: { myId, senderId },
        type: sequelize.QueryTypes.UPDATE
    });
    
    if (io) {
        // Notify the sender that their messages to me have been read
        io.to(`user_${senderId}`).emit('messages_read', {
            readerId: myId
        });
    }
};

const getUnreadCount = async (myId) => {
    const [result] = await sequelize.query(`
      SELECT 
        COUNT(*) AS "totalUnreadMessages",
        COUNT(DISTINCT "sender_id") AS "totalUnreadChats"
      FROM "messages"
      WHERE "receiver_id" = :myId AND "sender_id" != :myId AND "is_read" = false;
    `, {
        replacements: { myId },
        type: sequelize.QueryTypes.SELECT
    });

    return {
        count: parseInt(result.totalUnreadMessages || 0, 10),
        chatCount: parseInt(result.totalUnreadChats || 0, 10)
    };
};

const unassignUser = async (targetUserId, myId, myRole, io) => {
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
        throw new Error('User not found');
    }

    if (targetUser.assignedAgentId !== myId && myRole !== 'admin') {
        throw new Error('You can only unassign users assigned to you.');
    }

    await User.update({ assignedAgentId: null }, { where: { id: targetUserId } });

    if (io) {
        // Tell the user they were unassigned
        io.to(`user_${targetUserId}`).emit('session_closed', {
            message: "Your session with the agent has ended."
        });
        // Tell the agent to refresh their user list
        io.to(`user_${myId}`).emit('session_closed_agent', {
            userId: targetUserId
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getChatUsers,
    markMessagesAsRead,
    getUnreadCount,
    unassignUser
};
