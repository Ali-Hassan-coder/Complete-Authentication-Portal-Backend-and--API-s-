const { User, Role, Permission, UserRolePermission } = require('../models');

const getUserPermissions = async (userId) => {
    const user = await User.findByPk(userId, {
        include: [
            {
                model: Role,
                as: 'roles',
                include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
                through: { attributes: [] }
            }
        ]
    });

    if (!user) {
        throw new Error('User not found');
    }

    const permissionSet = new Set();

    // Base permissions from each assigned role
    for (const role of user.roles) {
        for (const permission of role.permissions) {
            permissionSet.add(permission.name);
        }
    }

    // Per-user, per-role overrides (extra permissions beyond the role's defaults)
    const overrides = await UserRolePermission.findAll({
        where: { user_id: userId },
        include: [{ model: Permission }]
    });

    for (const override of overrides) {
        permissionSet.add(override.Permission.name);
    }

    return Array.from(permissionSet);
};

const hasPermission = async (userId, permissionName) => {
    const permissions = await getUserPermissions(userId);
    return permissions.includes(permissionName);
};

const getUserRoles = async (userId) => {
    const user = await User.findByPk(userId, {
        include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
    });
    if (!user) throw new Error('User not found');
    return user.roles.map(r => r.name);
};

module.exports = { getUserPermissions, hasPermission, getUserRoles };