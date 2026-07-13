const { hasPermission } = require('../services/permissionService');

const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }

            const allowed = await hasPermission(req.user.id, permissionName);

            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    message: `Missing required permission: ${permissionName}`
                });
            }

            next();
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Permission check failed' });
        }
    };
};

module.exports = { requirePermission };