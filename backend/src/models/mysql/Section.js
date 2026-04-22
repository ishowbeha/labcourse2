const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Stadium = require('./Stadium');
const User = require('./User');

const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  stadiumId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'stadium_id',
    references: {
      model: Stadium,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  rowCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'row_count'
  },
  seatsPerRow: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'seats_per_row'
  },
  priceMultiplier: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.0,
    field: 'price_multiplier'
  },
  description: {
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
  tableName: 'sections',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['stadium_id', 'name']
    }
  ]
});

// Define associations
Stadium.hasMany(Section, { foreignKey: 'stadiumId' });
Section.belongsTo(Stadium, { foreignKey: 'stadiumId' });

User.hasMany(Section, { foreignKey: 'createdBy' });
Section.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Section;