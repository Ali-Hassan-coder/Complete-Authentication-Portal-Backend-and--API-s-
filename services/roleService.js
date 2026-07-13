const { Role, Permission, User, UserRole, RolePermission, UserRolePermission } = require('../models');

// ---------- ROLE CRUD ----------

const createRole = async ({ name, description }) => {
    const existing = await Role.findOne({ where: { name } });
    if (existing) throw new Error('Role with this name already exists');

    const role = await Role.create({ name, description });
    return { success: true, message: 'Role created successfully', role };
};

const getAllRoles = async () => {
    const roles = await Role.findAll({
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
    });
    return { success: true, roles };
};

const getRoleById = async (roleId) => {
    const role = await Role.findByPk(roleId, {
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
    });
    if (!role) throw new Error('Role not found');
    return { success: true, role };
};

const updateRoleDetails = async (roleId, updates) => {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    await role.update(updates);
    return { success: true, message: 'Role updated successfully', role };
};

const deleteRole = async (roleId) => {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    if (['user', 'moderator', 'admin'].includes(role.name)) {
        throw new Error('Cannot delete a core system role');
    }

    await role.destroy();
    return { success: true, message: 'Role deleted successfully' };
};

// ---------- PERMISSION CRUD ----------

const createPermission = async ({ name, description }) => {
    const existing = await Permission.findOne({ where: { name } });
    if (existing) throw new Error('Permission with this name already exists');

    const permission = await Permission.create({ name, description });
    return { success: true, message: 'Permission created successfully', permission };
};

const getAllPermissions = async () => {
    const permissions = await Permission.findAll();
    return { success: true, permissions };
};

const getPermissionById = async (permissionId) => {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');
    return { success: true, permission };
};

const updatePermission = async (permissionId, updates) => {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');

    await permission.update(updates);
    return { success: true, message: 'Permission updated successfully', permission };
};

const deletePermission = async (permissionId) => {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');

    await permission.destroy();
    return { success: true, message: 'Permission deleted successfully' };
};

// ---------- ROLE <-> PERMISSION LINKING ----------

const assignPermissionToRole = async (roleId, permissionId) => {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');

    const existing = await RolePermission.findOne({ where: { role_id: roleId, permission_id: permissionId } });
    if (existing) throw new Error('Role already has this permission');

    await RolePermission.create({ role_id: roleId, permission_id: permissionId });
    return {
        success: true,
        message: 'Permission assigned to role successfully',
        data: { roleId, roleName: role.name, permissionId, permissionName: permission.name }
    };
};

const removePermissionFromRole = async (roleId, permissionId) => {
    const deleted = await RolePermission.destroy({ where: { role_id: roleId, permission_id: permissionId } });
    if (!deleted) throw new Error('Role does not have this permission');

    return { success: true, message: 'Permission removed from role' };
};

// ---------- USER <-> ROLE LINKING ----------

const assignRoleToUser = async (userId, roleId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    const existing = await UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
    if (existing) throw new Error('User already has this role');

    await UserRole.create({ user_id: userId, role_id: roleId });
    return {
        success: true,
        message: 'Role assigned to user successfully',
        data: { userId, roleId, roleName: role.name }
    };
};
const removeRoleFromUser = async (userId, roleId) => {
    const deleted = await UserRole.destroy({ where: { user_id: userId, role_id: roleId } });
    if (!deleted) throw new Error('User does not have this role');

    return { success: true, message: 'Role removed from user' };
};
const grantUserRolePermission = async (userId, roleId, permissionIds, grantedByAdminId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    const hasRole = await UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
    if (!hasRole) throw new Error('User does not have this role, cannot grant a role-scoped override');

    const results = [];
    const skipped = [];

    for (const permissionId of permissionIds) {
        const permission = await Permission.findByPk(permissionId);
        if (!permission) {
            skipped.push({ permissionId, reason: 'Permission not found' });
            continue;
        }

        const existing = await UserRolePermission.findOne({
            where: { user_id: userId, role_id: roleId, permission_id: permissionId }
        });
        if (existing) {
            skipped.push({ permissionId, reason: 'Already granted' });
            continue;
        }

        await UserRolePermission.create({
            user_id: userId,
            role_id: roleId,
            permission_id: permissionId,
            granted_by: grantedByAdminId
        });
        results.push({ permissionId, permissionName: permission.name });
    }

    return {
        message: 'Permission grant operation completed',
        data: { userId, roleId, roleName: role.name, granted: results, skipped }
    };
};
const revokeUserRolePermission = async (userId, roleId, permissionIds) => {
    const revoked = [];
    const skipped = [];

    for (const permissionId of permissionIds) {
        const deleted = await UserRolePermission.destroy({
            where: { user_id: userId, role_id: roleId, permission_id: permissionId }
        });

        if (deleted) {
            revoked.push(permissionId);
        } else {
            skipped.push({ permissionId, reason: 'Override did not exist' });
        }
    }

    return {
        message: 'Permission revoke operation completed',
        data: { userId, roleId, revoked, skipped }
    };
};
const getUserRolePermissions = async (userId, roleId) => {
    const overrides = await UserRolePermission.findAll({
        where: { user_id: userId, role_id: roleId },
        include: [{ model: Permission }]
    });
    return { success: true, overrides };
};
module.exports = {
    createRole, getAllRoles, getRoleById, updateRoleDetails, deleteRole,
    createPermission, getAllPermissions, getPermissionById, updatePermission, deletePermission,
    assignPermissionToRole, removePermissionFromRole,
    assignRoleToUser, removeRoleFromUser, grantUserRolePermission, revokeUserRolePermission, getUserRolePermissions
};