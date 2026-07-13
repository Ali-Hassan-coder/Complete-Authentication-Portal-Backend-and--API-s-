const roleService = require('../services/roleService');

const { success, error } = require('../utils/apiResponse');

const wrap = (fn, successStatus = 200) => async (req, res) => {
    try {
        const result = await fn(req);
        return success(res, successStatus, result.message, result.data ?? null);
    } catch (err) {
        return error(res, 400, err.message, null);
    }
};

const createRole = wrap((req) => roleService.createRole(req.body));
const getAllRoles = wrap(() => roleService.getAllRoles());
const getRoleById = wrap((req) => roleService.getRoleById(req.params.id));
const updateRoleDetails = wrap((req) => roleService.updateRoleDetails(req.params.id, req.body));
const deleteRole = wrap((req) => roleService.deleteRole(req.params.id));

const createPermission = wrap((req) => roleService.createPermission(req.body));
const getAllPermissions = wrap(() => roleService.getAllPermissions());
const getPermissionById = wrap((req) => roleService.getPermissionById(req.params.id));
const updatePermission = wrap((req) => roleService.updatePermission(req.params.id, req.body));
const deletePermission = wrap((req) => roleService.deletePermission(req.params.id));

const assignPermissionToRole = wrap((req) => roleService.assignPermissionToRole(req.body.roleId, req.body.permissionId));
const removePermissionFromRole = wrap((req) => roleService.removePermissionFromRole(req.params.id, req.params.permissionId));

const assignRoleToUser = wrap((req) => roleService.assignRoleToUser(req.body.userId, req.body.roleId));
const removeRoleFromUser = wrap((req) => roleService.removeRoleFromUser(req.params.id, req.params.roleId));

const grantUserRolePermission = wrap((req) =>
    roleService.grantUserRolePermission(req.body.userId, req.body.roleId, req.body.permissionIds, req.user.id)
);
const revokeUserRolePermission = wrap((req) =>
    roleService.revokeUserRolePermission(req.body.userId, req.body.roleId, req.body.permissionIds)
);
const getUserRolePermissions = wrap((req) =>
    roleService.getUserRolePermissions(req.params.userId, req.params.roleId)
);




module.exports = {
    createRole, getAllRoles, getRoleById, updateRoleDetails, deleteRole,
    createPermission, getAllPermissions, getPermissionById, updatePermission, deletePermission,
    assignPermissionToRole, removePermissionFromRole,
    assignRoleToUser, removeRoleFromUser,
    grantUserRolePermission, revokeUserRolePermission, getUserRolePermissions
};