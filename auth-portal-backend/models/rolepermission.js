'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class RolePermission extends Model {
        static associate(models) {
            RolePermission.belongsTo(models.Role, { foreignKey: 'role_id' });
            RolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id' });
        }
    }
    RolePermission.init({
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        permission_id: { type: DataTypes.INTEGER, allowNull: false }
    }, {
        sequelize,
        modelName: 'RolePermission',
        tableName: 'role_permissions',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return RolePermission;
};   