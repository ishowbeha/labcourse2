const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const User = require('./User');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(20),
    defaultValue: 'string',
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'general',
  },
  createdBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'created_by',
  },
  updatedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'updated_by',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'settings',
  timestamps: true,
  underscored: true,
});

User.hasMany(Setting, { foreignKey: 'createdBy', as: 'createdSettings' });
User.hasMany(Setting, { foreignKey: 'updatedBy', as: 'updatedSettings' });
Setting.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Setting.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

module.exports = Setting;
