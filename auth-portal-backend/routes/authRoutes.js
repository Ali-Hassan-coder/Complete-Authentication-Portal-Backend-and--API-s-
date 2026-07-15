const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

const { signupSchema } = require("../validator/authvalidator");
const { loginSchema } = require("../validator/loginvalidator");
const { forgotPasswordSchema } = require("../validator/forgotPasswordValidator");
const { verifyOtpSchema } = require("../validator/verifyOtpValidator");
const { resetPasswordSchema } = require("../validator/resetPasswordValidator");
const authenticate = require("../middleware/authMiddleware");
const { updateUserSchema } = require("../validator/updateUserValidator");
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
router.post(
    "/upload",
    authenticate,
    upload.single('file'),
    authController.uploadFile
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
