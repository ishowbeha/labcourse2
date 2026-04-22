const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Order = require('./Order');
const User = require('./User');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  orderId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'order_id',
    references: {
      model: Order,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  method: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
    defaultValue: 'pending'
  },
  transactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'transaction_id'
  },
  gatewayReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'gateway_reference'
  },
  gatewayResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'gateway_response'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refund_amount'
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
  tableName: 'payments',
  timestamps: true,
  underscored: true
});

// Define associations
Order.hasMany(Payment, { foreignKey: 'orderId' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Payment, { foreignKey: 'createdBy' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Payment;