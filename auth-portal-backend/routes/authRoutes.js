const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const chatController = require("../controllers/chatController");
const voiceController = require("../controllers/voiceController");

const { signupSchema } = require("../validator/authvalidator");
const { loginSchema } = require("../validator/loginvalidator");
const { forgotPasswordSchema } = require("../validator/forgotPasswordValidator");
const { verifyOtpSchema } = require("../validator/verifyOtpValidator");
const { resetPasswordSchema } = require("../validator/resetPasswordValidator");
const authenticate = require("../middleware/authMiddleware");
const { updateUserSchema } = require("../validator/updateUserValidator");
const multer = require("multer");
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const upload = require("../middleware/uploadMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const { updateRoleSchema } = require("../validator/updateRoleValidator");

const validateRequest = require("../middleware/validationMiddleware");

const routeWrapper = (schema, controller, handlerName) => {
    return [
        validateRequest(schema),

        (req, res, next) => {

            if (typeof controller !== "function") {
                return res.status(500).json({
                    success: false,
                    message: `${handlerName} handler not available`
                });
            }

            return controller(req, res, next);

        }
    ];
};

router.post(
    "/signup",
    ...routeWrapper(signupSchema, authController.signup, "Signup")
);

router.post(
    "/login",
    ...routeWrapper(loginSchema, authController.login, "Login")
);

router.post(
    "/forgot-password",
    ...routeWrapper(forgotPasswordSchema, authController.forgotPassword, "Forgot Password")
);

router.post(
    "/verify-otp",
    ...routeWrapper(verifyOtpSchema, authController.verifyOtp, "Verify OTP")
);

router.post(
    "/reset-password",
    ...routeWrapper(resetPasswordSchema, authController.resetPassword, "Reset Password")
);
router.post(
    "/refresh",
    authController.refresh
);
router.get(
    "/me",
    authenticate,
    authController.getProfile
);

router.put(
    "/me",
    authenticate,
    ...routeWrapper(updateUserSchema, authController.updateProfile, "Update Profile")
);
router.put(
    "/change-password",
    authenticate,
    authController.changePassword
);
router.post(
    "/upload",
    authenticate,
    upload.single('file'),
    authController.uploadFile
);
router.post(
    "/chat",
    authenticate,
    chatController.handleChatMessage
);
router.post(
    "/transcribe",
    authenticate,
    memoryUpload.single('file'),
    voiceController.transcribe
);
router.get(
    "/files",
    authenticate,
    authController.listUploadedFiles
);
router.post(
    "/messages",
    authenticate,
    authController.sendMessage
);
router.get(
    "/messages/:userId",
    authenticate,
    authController.getMessages
);
router.get(
    "/chat-users",
    authenticate,
    authController.getChatUsers
);
router.get(
    "/export-users",
    authenticate,
    requirePermission('export_reports'),
    authController.exportUsers
);
router.get(
    "/users",
    authenticate,
    requirePermission('list_users'),
    authController.getAllUsers
);

router.get(
    "/users/:id",
    authenticate,
    requirePermission('view_any_profile'),
    authController.getUserById
);

router.put(
    "/users/:id",
    authenticate,
    requirePermission('edit_any_profile'),
    ...routeWrapper(updateUserSchema, authController.updateUserById, "Update User")
);

router.delete(
    "/users/:id",
    authenticate,
    requirePermission('delete_user'),
    authController.deleteUser
);

router.put(
    "/users/:id/role",
    authenticate,
    requirePermission('view_any_profile'),
    ...routeWrapper(updateRoleSchema, authController.updateUserRole, "Update Role")
);
module.exports = router;
