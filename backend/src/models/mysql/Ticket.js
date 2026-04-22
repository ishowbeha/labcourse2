const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Match = require('./Match');
const Section = require('./Section');
const User = require('./User');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  matchId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'match_id',
    references: {
      model: Match,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sectionId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'section_id',
    references: {
      model: Section,
      key: 'id'
    }
  },
  rowNumber: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'row_number'
  },
  seatNumber: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'seat_number'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'sold', 'cancelled'),
    defaultValue: 'available'
  },
  qrCode: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'qr_code'
  },
  barcode: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'barcode'
  },
  purchaserId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'purchaser_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  purchasedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'purchased_at'
  },
  reservedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reserved_until'
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
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['match_id', 'section_id', 'row_number', 'seat_number']
    },
    {
      fields: ['match_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['purchaser_id']
    }
  ]
});

// Define associations
Match.hasMany(Ticket, { foreignKey: 'matchId' });
Ticket.belongsTo(Match, { foreignKey: 'matchId' });

Section.hasMany(Ticket, { foreignKey: 'sectionId' });
Ticket.belongsTo(Section, { foreignKey: 'sectionId' });

module.exports = Ticket;