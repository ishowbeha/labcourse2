const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Order = require('./Order');
const Ticket = require('./Ticket');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'order_id',
    references: { model: Order, key: 'id' },
    onDelete: 'CASCADE',
  },
  ticketId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'ticket_id',
    references: { model: Ticket, key: 'id' },
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price',
  },
  quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 1,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
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
  tableName: 'order_items',
  timestamps: true,
  underscored: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
});

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Ticket.hasMany(OrderItem, { foreignKey: 'ticketId' });
OrderItem.belongsTo(Ticket, { foreignKey: 'ticketId' });

module.exports = OrderItem;
