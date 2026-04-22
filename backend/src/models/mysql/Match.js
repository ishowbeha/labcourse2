const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');
const Stadium = require('./Stadium');
const User = require('./User');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  homeTeam: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'home_team'
  },
  awayTeam: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'away_team'
  },
  stadiumId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'stadium_id',
    references: {
      model: Stadium,
      key: 'id'
    }
  },
  matchDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'match_date'
  },
  matchTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'match_time'
  },
  competition: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  round: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'completed', 'cancelled', 'postponed'),
    defaultValue: 'scheduled'
  },
  homeScore: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    field: 'home_score'
  },
  awayScore: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
    field: 'away_score'
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_price'
  },
  maxTicketsPerUser: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 4,
    field: 'max_tickets_per_user'
  },
  saleStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sale_start_date'
  },
  saleEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sale_end_date'
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
  tableName: 'matches',
  timestamps: true,
  underscored: true
});

// Define associations
Stadium.hasMany(Match, { foreignKey: 'stadiumId' });
Match.belongsTo(Stadium, { foreignKey: 'stadiumId' });

User.hasMany(Match, { foreignKey: 'createdBy' });
Match.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Match;