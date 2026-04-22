const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const User = require('./User');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(50),
    defaultValue: 'string'
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
  tableName: 'settings',
  timestamps: true,
  underscored: true
});

// Define associations
User.hasMany(Setting, { foreignKey: 'createdBy' });
Setting.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Setting;