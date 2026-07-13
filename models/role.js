'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            Role.belongsToMany(models.User, {
                through: models.UserRole,
                foreignKey: 'role_id',
                otherKey: 'user_id',
                as: 'users'
            });
            Role.belongsToMany(models.Permission, {
                through: models.RolePermission,
                foreignKey: 'role_id',
                otherKey: 'permission_id',
                as: 'permissions'
            });
        }
    }
    Role.init({
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        description: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'Role',
        tableName: 'roles',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Role;
};