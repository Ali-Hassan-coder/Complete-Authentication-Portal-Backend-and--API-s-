const express = require("express");
const router = express.Router();

const roleController = require("../controllers/roleController");
const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const { createRoleSchema, updateRoleDetailsSchema } = require("../validator/roleValidator");
const { createPermissionSchema, updatePermissionSchema } = require("../validator/permissionValidator");
const { assignPermissionSchema } = require("../validator/assignPermissionValidator");
const { assignRoleSchema } = require("../validator/assignRoleValidator");
const { userRolePermissionSchema } = require("../validator/userRolePermissionValidator");

// All routes here require 'manage_roles' permission (admin only, per your seed data)
router.use(authenticate, requirePermission('manage_roles'));

// ---- Role CRUD ----
router.post("/roles", validateRequest(createRoleSchema), roleController.createRole);
router.get("/roles", roleController.getAllRoles);
router.get("/roles/:id", roleController.getRoleById);
router.put("/roles/:id", validateRequest(updateRoleDetailsSchema), roleController.updateRoleDetails);
router.delete("/roles/:id", roleController.deleteRole);

// ---- Permission CRUD ----
router.post("/permissions", validateRequest(createPermissionSchema), roleController.createPermission);
router.get("/permissions", roleController.getAllPermissions);
router.get("/permissions/:id", roleController.getPermissionById);
router.put("/permissions/:id", validateRequest(updatePermissionSchema), roleController.updatePermission);
router.delete("/permissions/:id", roleController.deletePermission);

// ---- Role <-> Permission linking ----
router.put("/roles/permissions", validateRequest(assignPermissionSchema), roleController.assignPermissionToRole);
router.delete("/roles/:id/permissions/:permissionId", roleController.removePermissionFromRole);

// ---- User <-> Role linking ----
router.put("/users/roles", validateRequest(assignRoleSchema), roleController.assignRoleToUser);
router.delete("/users/:id/roles/:roleId", roleController.removeRoleFromUser);

// ---- Per-user, per-role permission overrides ----
router.put("/users/roles/permissions", validateRequest(userRolePermissionSchema), roleController.grantUserRolePermission);
router.delete("/users/roles/permissions", validateRequest(userRolePermissionSchema), roleController.revokeUserRolePermission);
router.get("/users/:userId/roles/:roleId/permissions", roleController.getUserRolePermissions);
module.exports = router;