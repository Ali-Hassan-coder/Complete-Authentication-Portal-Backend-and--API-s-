'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserRole extends Model {
        static associate(models) {
            UserRole.belongsTo(models.User, { foreignKey: 'user_id' });
            UserRole.belongsTo(models.Role, { foreignKey: 'role_id' });
        }
    }
    UserRole.init({
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        role_id: { type: DataTypes.INTEGER, allowNull: false }
    }, {
        sequelize,
        modelName: 'UserRole',
        tableName: 'user_roles',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });
    return UserRole;
};