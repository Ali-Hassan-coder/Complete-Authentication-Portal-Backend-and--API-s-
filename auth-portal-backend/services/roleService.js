const { Role, Permission, User, UserRole, RolePermission, UserRolePermission } = require('../models');

// ---------- ROLE CRUD ----------

const createRole = async ({ name, description }) => {
    const existing = await Role.findOne({ where: { name } });
    if (existing) throw new Error('Role with this name already exists');

    const role = await Role.create({ name, description });
    return { message: 'Role created successfully', data: role };
};

const getAllRoles = async () => {
    const roles = await Role.findAll({
        attributes: { exclude: ['created_at', 'updated_at'] },
        include: [{
            model: Permission,
            as: 'permissions',
            attributes: { exclude: ['created_at', 'updated_at'] },
            through: { attributes: [] }
        }]
    });
    return { message: 'Roles retrieved successfully', data: roles };
};
const getRoleById = async (roleId) => {
    const role = await Role.findByPk(roleId, {
        attributes: { exclude: ['created_at', 'updated_at'] },
        include: [{
            model: Permission,
            as: 'permissions',
            attributes: { exclude: ['created_at', 'updated_at'] },
            through: { attributes: [] }
        }]
    });
    if (!role) throw new Error('Role not found');
    return { message: 'Role retrieved successfully', data: role };
};

const updateRoleDetails = async (roleId, updates) => {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    await role.update(updates);
    return { message: 'Role updated successfully', data: role };
};

const deleteRole = async (roleId) => {
    const role = await Role.findByPk(roleId);
    if (!role) throw new Error('Role not found');

    if (['user', 'moderator', 'admin'].includes(role.name)) {
        throw new Error('Cannot delete a core system role');
    }

    await role.destroy();
    return { message: 'Role deleted successfully', data: null };
};

// ---------- PERMISSION CRUD ----------

const createPermission = async ({ name, description }) => {
    const existing = await Permission.findOne({ where: { name } });
    if (existing) throw new Error('Permission with this name already exists');

    const permission = await Permission.create({ name, description });
    return { message: 'Permission created successfully', data: permission };
};

const getAllPermissions = async () => {
    const permissions = await Permission.findAll({
        attributes: { exclude: ['created_at', 'updated_at'] }
    });
    return { message: 'Permissions retrieved successfully', data: permissions };
};

const getPermissionById = async (permissionId) => {
    const permission = await Permission.findByPk(permissionId, {
        attributes: { exclude: ['created_at', 'updated_at'] }
    });
    if (!permission) throw new Error('Permission not found');
    return { message: 'Permission retrieved successfully', data: permission };
};

const updatePermission = async (permissionId, updates) => {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');

    await permission.update(updates);
    return { message: 'Permission updated successfully', data: permission };
};

const deletePermission = async (permissionId) => {
    const permission = await Permission.findByPk(permissionId);
    if (!permission) throw new Error('Permission not found');

    await permission.destroy();
    return { message: 'Permission deleted successfully', data: null };
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
        message: 'Permission assigned to role successfully',
        data: { roleId, roleName: role.name, permissionId, permissionName: permission.name }
    };
};

const removePermissionFromRole = async (roleId, permissionId) => {
    const deleted = await RolePermission.destroy({ where: { role_id: roleId, permission_id: permissionId } });
    if (!deleted) throw new Error('Role does not have this permission');

    return { message: 'Permission removed from role successfully', data: null };
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
        message: 'Role assigned to user successfully',
        data: { userId, roleId, roleName: role.name }
    };
};

const removeRoleFromUser = async (userId, roleId) => {
    const deleted = await UserRole.destroy({ where: { user_id: userId, role_id: roleId } });
    if (!deleted) throw new Error('User does not have this role');

    return { message: 'Role removed from user successfully', data: null };
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
        attributes: ['id'],
        include: [{
            model: Permission,
            attributes: ['id', 'name', 'description']
        }]
    });

    const permissions = overrides.map(o => ({
        grantId: o.id,
        id: o.Permission.id,
        name: o.Permission.name,
        description: o.Permission.description
    }));

    return {
        message: 'User role-scoped permissions retrieved successfully',
        data: { userId: Number(userId), roleId: Number(roleId), permissions }
    };
};

module.exports = {
    createRole, getAllRoles, getRoleById, updateRoleDetails, deleteRole,
    createPermission, getAllPermissions, getPermissionById, updatePermission, deletePermission,
    assignPermissionToRole, removePermissionFromRole,
    assignRoleToUser, removeRoleFromUser, grantUserRolePermission, revokeUserRolePermission, getUserRolePermissions
};  