const roleService = require('../services/roleService');

const { success, error } = require('../utils/apiResponse');

const wrap = (fn, successStatus = 200) => async (req, res) => {
    try {
        const result = await fn(req);
        if (req.method !== 'GET') {
            const { notifySystemChange } = require('../services/notificationService');
            let msg = `System configuration updated: ${req.method} ${req.originalUrl}`;
            if (req.originalUrl.includes('permissions')) {
                if (req.method === 'POST') msg = `New system permission created by Admin.`;
                else if (req.method === 'PUT') msg = `User custom permission overrides updated.`;
                else if (req.method === 'DELETE') msg = `System permission removed by Admin.`;
            } else if (req.originalUrl.includes('roles')) {
                if (req.method === 'POST') msg = `New system role configuration added.`;
                else if (req.method === 'PUT') msg = `System roles mapping modified.`;
            }
            notifySystemChange(req.app, msg);
        }
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