const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    field: 'created_by'
  },
  updatedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    field: 'updated_by'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  underscored: true
});

module.exports = Permission;