const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const User = require('./User');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'user_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  entity: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'entity_id'
  },
  oldValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'old_value',
    get() {
      const rawValue = this.getDataValue('oldValue');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('oldValue', value ? JSON.stringify(value) : null);
    }
  },
  newValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'new_value',
    get() {
      const rawValue = this.getDataValue('newValue');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('newValue', value ? JSON.stringify(value) : null);
    }
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  underscored: true
});

// Define associations
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = AuditLog;