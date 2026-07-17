const { User, Role, UserRole } = require("../models");
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('./emailService');
const permissionService = require('./permissionService');
const fs = require('fs');
const path = require('path');


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const signup = async (userData) => {
    const { name, email, password, phone } = userData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({ name, email, password: hashedPassword, phone });
    return { success: true, message: 'User created successfully', user };
};

const login = async (credentials) => {
    const { email, password } = credentials;
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new Error('Invalid Credentials');
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
        throw new Error('Invalid Credentials');
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    await user.update({ refreshToken });

    return { success: true, message: 'Login Successful', token, refreshToken, user };
};

const forgotPassword = async ({ email }) => {
    if (!email) throw new Error('Email is required');

    const user = await User.findOne({ where: { email } });

    if (!user) {
        throw new Error('No account found with that email address.');
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.update({ otpCode: otp, otpExpiry: expiry });

    try {
        await sendOtpEmail(user.email, otp);
    } catch (err) {
        console.error('Failed to send OTP email:', err.message);
        throw new Error('Failed to send OTP email. Please try again later.');
    }

    return { success: true, message: 'An OTP has been sent to your email address.' };
};


const verifyOtp = async ({ email, otp }) => {
    const user = await User.findOne({ where: { email } });
    console.log('now:', new Date().toISOString(), 'expiry:', new Date(user.otpExpiry).toISOString(), 'raw expiry from DB:', user.otpExpiry);
    if (!user || !user.otpCode || !user.otpExpiry) {
        throw new Error('Invalid or expired OTP');
    }

    if (user.otpCode !== otp) {
        throw new Error('Invalid or expired OTP');
    }

    if (new Date() > new Date(user.otpExpiry)) {
        throw new Error('Invalid or expired OTP');
    }

    await user.update({ otpCode: null, otpExpiry: null });

    const resetToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || '10m' }
    );

    return { success: true, message: 'OTP verified successfully', resetToken };
};

const resetPassword = async ({ resetToken, newPassword }) => {
    let decoded;
    try {
        decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired reset token');
    }

    if (decoded.purpose !== 'password-reset') {
        throw new Error('Invalid reset token');
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
        throw new Error('User not found');
    }

    const hashedPassword = await hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    return { success: true, message: 'Password reset successfully' };
};

const getProfile = async (userId, baseUrl) => {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'otpCode', 'otpExpiry', 'refreshToken', 'accessToken', 'created_at', 'updated_at'] }
    });
    if (!user) throw new Error('User not found');

    const userData = user.toJSON();
    if (userData.profileFile) {
        userData.profileFile = `${baseUrl}${userData.profileFile}`;
    } else {
        delete userData.profileFile;
    }

    const permissions = await permissionService.getUserPermissions(userId);
    userData.permissions = permissions;

    return { message: 'Profile retrieved successfully', data: userData };
};

const updateProfile = async (userId, updates) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }

    await user.update(updates);

    const { password, otpCode, otpExpiry, refreshToken, accessToken, ...safeUser } = user.toJSON();
    return { success: true, message: 'Profile updated successfully', user: safeUser };
};
const uploadFile = async (userId, file, category, baseUrl) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const relativePath = `/uploads/${category}/${file.filename}`;
    await user.update({ profileFile: relativePath });

    return {
        success: true,
        message: 'File uploaded successfully',
        file: {
            originalName: file.originalname,
            category,
            size: file.size,
            mimetype: file.mimetype,
            relativePath,
            url: `${baseUrl}${relativePath}` // full dynamic URL
        }
    };
};

const getAllUsers = async () => {
    const users = await User.findAll({
        attributes: { exclude: ['password', 'otpCode', 'otpExpiry', 'refreshToken', 'accessToken', 'created_at', 'updated_at'] }
    });

    const cleanUsers = await Promise.all(users.map(async u => {
        const userData = u.toJSON();
        if (!userData.profileFile) delete userData.profileFile;
        userData.permissions = await permissionService.getUserPermissions(u.id);
        return userData;
    }));

    return { message: 'Users retrieved successfully', data: cleanUsers };
};
const deleteUser = async (targetUserId, requesterId) => {
    if (parseInt(targetUserId) === requesterId) {
        throw new Error('Admins cannot delete their own account through this endpoint');
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
        throw new Error('User not found');
    }

    await user.destroy();
    return { success: true, message: 'User deleted successfully' };
};

const updateUserRole = async (targetUserId, newRole, requesterId) => {
    if (parseInt(targetUserId) === requesterId) {
        throw new Error('You cannot change your own role');
    }

    const requester = await User.findByPk(requesterId);
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
        throw new Error('User not found');
    }

    const roleNameClean = newRole.trim().toLowerCase();

    // Rule: Cannot change role to Admin unless requester is Admin
    if (roleNameClean === 'admin' && requester.role !== 'admin') {
        throw new Error('Only Admins can assign the Admin role');
    }

    // Rule: Moderator can only change User to Moderator
    if (requester.role === 'moderator') {
        if (targetUser.role === 'user' && roleNameClean === 'moderator') {
            // allowed
        } else {
            throw new Error('Moderators can only promote Users to Moderator');
        }
    }

    await targetUser.update({ role: roleNameClean });

    // Sync the user_roles mapping table!
    const roleRecord = await Role.findOne({ where: { name: roleNameClean } });
    if (roleRecord) {
        // Remove existing roles
        await UserRole.destroy({ where: { user_id: targetUserId } });
        // Assign new role
        await UserRole.create({ user_id: targetUserId, role_id: roleRecord.id });
    } else {
        console.warn(`Role ${roleNameClean} not found in Roles table during sync.`);
    }

    return { success: true, message: `User role updated to ${roleNameClean}` };
};

const getUserById = async (targetUserId, baseUrl) => {
    const user = await User.findByPk(targetUserId, {
        attributes: { exclude: ['password', 'otpCode', 'otpExpiry', 'refreshToken', 'accessToken', 'created_at', 'updated_at'] }
    });
    if (!user) throw new Error('User not found');

    const userData = user.toJSON();
    if (userData.profileFile) {
        userData.profileFile = `${baseUrl}${userData.profileFile}`;
    } else {
        delete userData.profileFile;
    }

    const permissions = await permissionService.getUserPermissions(targetUserId);
    userData.permissions = permissions;

    return { message: 'User retrieved successfully', data: userData };
};
const updateUserById = async (targetUserId, updates) => {
    const user = await User.findByPk(targetUserId);
    if (!user) {
        throw new Error('User not found');
    }

    // Moderators/admins can only edit basic info here, never role/password/email
    await user.update(updates);

    const { password, otpCode, otpExpiry, refreshToken, accessToken, ...safeUser } = user.toJSON();
    return { success: true, message: 'User updated successfully', user: safeUser };
};

const listUploadedFiles = async (baseUrl) => {
    const PUBLIC_ROOT = path.join(__dirname, '..', 'public', 'uploads');
    const categories = ['images', 'videos', 'documents', 'others'];
    const files = [];

    categories.forEach(category => {
        const dirPath = path.join(PUBLIC_ROOT, category);
        if (fs.existsSync(dirPath)) {
            const dirFiles = fs.readdirSync(dirPath);
            dirFiles.forEach(fileName => {
                const stat = fs.statSync(path.join(dirPath, fileName));
                const relativePath = `/uploads/${category}/${fileName}`;
                files.push({
                    name: fileName,
                    category,
                    size: stat.size,
                    relativePath,
                    url: `${baseUrl}${relativePath}`,
                    uploadedAt: stat.mtime
                });
            });
        }
    });

    files.sort((a, b) => b.uploadedAt - a.uploadedAt);
    return { success: true, message: 'Files list retrieved', data: files };
};

const refreshSession = async ({ refreshToken }) => {
    if (!refreshToken) {
        throw new Error('Refresh token is required');
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findOne({ where: { id: decoded.id, refreshToken } });
    if (!user) {
        throw new Error('Invalid or expired refresh token');
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return { success: true, token };
};

const changePassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
        throw new Error('Incorrect current password');
    }

    const hashedPassword = await hashPassword(newPassword);
    await user.update({ password: hashedPassword });

    return { success: true, message: 'Password updated successfully' };
};

const updateStatus = async (userId, status) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    if (!['online', 'offline', 'busy'].includes(status)) {
        throw new Error('Invalid status');
    }
    await user.update({ status });
    return { success: true, message: 'Status updated successfully', status };
};

module.exports = {
    signup, login, forgotPassword, verifyOtp, resetPassword, getProfile, updateProfile, uploadFile, getAllUsers, deleteUser, updateUserRole, getUserById, updateUserById, refreshSession,
    listUploadedFiles, changePassword, updateStatus
};