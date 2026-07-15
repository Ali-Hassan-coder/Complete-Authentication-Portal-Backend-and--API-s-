'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserRolePermission extends Model {
        static associate(models) {
            UserRolePermission.belongsTo(models.User, { foreignKey: 'user_id' });
            UserRolePermission.belongsTo(models.Role, { foreignKey: 'role_id' });
            UserRolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id' });
            UserRolePermission.belongsTo(models.User, { foreignKey: 'granted_by', as: 'grantedByUser' });
        }
    }
    UserRolePermission.init({
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        permission_id: { type: DataTypes.INTEGER, allowNull: false },
        granted_by: { type: DataTypes.INTEGER, allowNull: true }
    }, {
        sequelize,
        modelName: 'UserRolePermission',
        tableName: 'user_role_permissions',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return UserRolePermission;
};