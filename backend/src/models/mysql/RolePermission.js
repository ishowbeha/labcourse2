const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Role = require('./Role');
const Permission = require('./Permission');

const RolePermission = sequelize.define('RolePermission', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  roleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'role_id',
    references: {
      model: Role,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  permissionId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'permission_id',
    references: {
      model: Permission,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  grantedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    field: 'granted_by'
  },
  grantedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'granted_at'
  }
}, {
  tableName: 'role_permissions',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['role_id', 'permission_id']
    }
  ]
});

// Define associations
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId' });

module.exports = RolePermission;