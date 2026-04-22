const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const User = require('./User');

const Order = sequelize.define('Order', {
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
    }
  },
  orderNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'paid', 'cancelled', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'payment_reference'
  },
  customerEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'customer_email'
  },
  customerPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'customer_phone'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'orders',
  timestamps: true,
  underscored: true
});

// Define associations
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'createdBy' });
Order.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Order;