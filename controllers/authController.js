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
module.exports = { signup, login, forgotPassword, verifyOtp, resetPassword, getProfile, updateProfile, uploadFile, getAllUsers, deleteUser, updateUserRole, getUserById, updateUserById };
