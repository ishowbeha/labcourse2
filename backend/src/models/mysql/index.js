// Import all MySQL models
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const UserRole = require('./UserRole');
const RolePermission = require('./RolePermission');
const RefreshToken = require('./RefreshToken');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const Setting = require('./Setting');
const Stadium = require('./Stadium');
const Section = require('./Section');
const Match = require('./Match');
const Ticket = require('./Ticket');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(RefreshToken, { foreignKey: 'userId' });
  User.hasMany(AuditLog, { foreignKey: 'userId' });
  User.hasMany(Notification, { foreignKey: 'userId' });
  User.hasMany(Stadium, { foreignKey: 'createdBy' });
  User.hasMany(Section, { foreignKey: 'createdBy' });
  User.hasMany(Match, { foreignKey: 'createdBy' });
  User.hasMany(Ticket, { foreignKey: 'purchaserId', as: 'purchasedTickets' });
  User.hasMany(Ticket, { foreignKey: 'createdBy', as: 'createdTickets' });
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
  User.hasMany(Order, { foreignKey: 'createdBy', as: 'createdOrders' });
  User.hasMany(Payment, { foreignKey: 'createdBy', as: 'createdPayments' });
  User.hasMany(Setting, { foreignKey: 'createdBy', as: 'createdSettings' });
  User.hasMany(Setting, { foreignKey: 'updatedBy', as: 'updatedSettings' });

  // Role associations
  Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', otherKey: 'userId' });
  Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId' });

  // Permission associations
  Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId' });

  // Stadium associations
  Stadium.hasMany(Section, { foreignKey: 'stadiumId' });
  Stadium.hasMany(Match, { foreignKey: 'stadiumId' });

  // Section associations
  Section.belongsTo(Stadium, { foreignKey: 'stadiumId' });
  Section.hasMany(Ticket, { foreignKey: 'sectionId' });

  // Match associations
  Match.belongsTo(Stadium, { foreignKey: 'stadiumId' });
  Match.hasMany(Ticket, { foreignKey: 'matchId' });

  // Ticket associations
  Ticket.belongsTo(Match, { foreignKey: 'matchId' });
  Ticket.belongsTo(Section, { foreignKey: 'sectionId' });
  Ticket.belongsTo(User, { foreignKey: 'purchaserId', as: 'purchaser' });

  // Order associations
  Order.belongsTo(User, { foreignKey: 'userId' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId' });
  Order.hasMany(Payment, { foreignKey: 'orderId' });

  // OrderItem associations
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
  OrderItem.belongsTo(Ticket, { foreignKey: 'ticketId' });

  // Payment associations
  Payment.belongsTo(Order, { foreignKey: 'orderId' });
};

module.exports = {
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  RefreshToken,
  AuditLog,
  Notification,
  Setting,
  Stadium,
  Section,
  Match,
  Ticket,
  Order,
  OrderItem,
  Payment,
  defineAssociations
};