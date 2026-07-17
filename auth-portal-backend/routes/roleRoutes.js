const express = require("express");
const router = express.Router();

const roleController = require("../controllers/roleController");
const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validationMiddleware");
const routeUtils = require("../utils/routeUtils");
const { createRoleSchema, updateRoleDetailsSchema } = require("../validator/roleValidator");
const { createPermissionSchema, updatePermissionSchema } = require("../validator/permissionValidator");
const { assignPermissionSchema } = require("../validator/assignPermissionValidator");
const { assignRoleSchema } = require("../validator/assignRoleValidator");
const { userRolePermissionSchema } = require("../validator/userRolePermissionValidator");

// All routes here require 'manage_roles' permission (admin only, per your seed data)
router.use(authenticate, requirePermission('manage_roles'));

// ---- Role CRUD ----
router.post("/roles", ...routeUtils.routeWrapper(createRoleSchema, roleController.createRole, "Create Role"));
router.get("/roles", roleController.getAllRoles);
router.get("/roles/:id", roleController.getRoleById);
router.put("/roles/:id", ...routeUtils.routeWrapper(updateRoleDetailsSchema, roleController.updateRoleDetails, "Update Role Details"));
router.delete("/roles/:id", roleController.deleteRole);

// ---- Permission CRUD ----
router.post("/permissions", ...routeUtils.routeWrapper(createPermissionSchema, roleController.createPermission, "Create Permission"));
router.get("/permissions", roleController.getAllPermissions);
router.get("/permissions/:id", roleController.getPermissionById);
router.put("/permissions/:id", ...routeUtils.routeWrapper(updatePermissionSchema, roleController.updatePermission, "Update Permission"));
router.delete("/permissions/:id", roleController.deletePermission);

// ---- Role <-> Permission linking ----
router.put("/roles/permissions", ...routeUtils.routeWrapper(assignPermissionSchema, roleController.assignPermissionToRole, "Assign Permission"));
router.delete("/roles/:id/permissions/:permissionId", roleController.removePermissionFromRole);

// ---- User <-> Role linking ----
router.put("/users/roles", ...routeUtils.routeWrapper(assignRoleSchema, roleController.assignRoleToUser, "Assign Role"));
router.delete("/users/:id/roles/:roleId", roleController.removeRoleFromUser);

// ---- Per-user, per-role permission overrides ----
router.put("/users/roles/permissions", ...routeUtils.routeWrapper(userRolePermissionSchema, roleController.grantUserRolePermission, "Grant Permission"));
router.delete("/users/roles/permissions", ...routeUtils.routeWrapper(userRolePermissionSchema, roleController.revokeUserRolePermission, "Revoke Permission"));
router.get("/users/:userId/roles/:roleId/permissions", roleController.getUserRolePermissions);
module.exports = router;