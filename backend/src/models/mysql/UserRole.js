const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const User = require('./User');
const Role = require('./Role');

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  assignedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    field: 'assigned_by'
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'assigned_at'
  }
}, {
  tableName: 'user_roles',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'role_id']
    }
  ]
});

// Define associations
User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId', otherKey: 'roleId' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', otherKey: 'userId' });

module.exports = UserRole;