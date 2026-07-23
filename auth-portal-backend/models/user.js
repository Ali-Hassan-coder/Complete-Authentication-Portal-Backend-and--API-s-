'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      User.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
      });
    }
  }
  User.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },

      role: {
        type: DataTypes.STRING,
        defaultValue: "user"
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'offline'
      },

      otpCode: {
        type: DataTypes.STRING,
        field: 'otpcode'
      },

      otpExpiry: {
        type: DataTypes.DATE,
        field: 'otpexpiry'
      },

      refreshToken: {
        type: DataTypes.TEXT,
        field: 'refresh_token'
      },
      profileFile: {
        type: DataTypes.STRING,
        field: 'profile_file'
      },

      accessToken: {
        type: DataTypes.TEXT,
        field: 'access_token'
      },
      assignedAgentId: {
        type: DataTypes.INTEGER,
        field: 'assigned_agent_id',
        allowNull: true
      },
      organizationId: {
        type: DataTypes.INTEGER,
        field: 'organization_id',
        allowNull: true // True for now so existing data doesn't crash before assignment
      }
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
  return User;
};