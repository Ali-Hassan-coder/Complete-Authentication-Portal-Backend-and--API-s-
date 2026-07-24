'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Permission extends Model {
        static associate(models) {
            Permission.belongsToMany(models.Role, {
                through: models.RolePermission,
                foreignKey: 'permission_id',
                otherKey: 'role_id',
                as: 'roles'
            });
        }
    }
    Permission.init({
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        description: DataTypes.STRING,
        organizationId: { type: DataTypes.INTEGER, allowNull: true }
    }, {
        sequelize,
        modelName: 'Permission',
        tableName: 'permissions',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return Permission;
};