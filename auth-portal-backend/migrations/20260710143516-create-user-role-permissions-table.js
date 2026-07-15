'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_role_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onDelete: 'CASCADE'
      },
      role_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'roles', key: 'id' }, onDelete: 'CASCADE'
      },
      permission_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'permissions', key: 'id' }, onDelete: 'CASCADE'
      },
      granted_by: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onDelete: 'SET NULL'
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });
    await queryInterface.addConstraint('user_role_permissions', {
      fields: ['user_id', 'role_id', 'permission_id'],
      type: 'unique',
      name: 'unique_user_role_permission'
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('user_role_permissions');
  }
};