const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  matchId: { type: DataTypes.INTEGER.UNSIGNED, field: 'match_id' },
  stadiumId: { type: DataTypes.INTEGER.UNSIGNED, field: 'stadium_id' },
  rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 5 },
  comment: { type: DataTypes.TEXT },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_approved' },
  createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'created_by' },
  updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'updated_by' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, { tableName: 'reviews', timestamps: true, underscored: true });

module.exports = Review;
