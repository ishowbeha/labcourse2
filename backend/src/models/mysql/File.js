const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/mysql');

const File = sequelize.define('File', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
  userId: { type: DataTypes.INTEGER.UNSIGNED, field: 'user_id' },
  entity: { type: DataTypes.STRING(50), allowNull: true },
  entityType: { type: DataTypes.STRING(50), field: 'entity_type' },
  entityId: { type: DataTypes.INTEGER.UNSIGNED, field: 'entity_id' },
  filename: { type: DataTypes.STRING(500), allowNull: true },
  originalName: { type: DataTypes.STRING(500), allowNull: false, field: 'original_name' },
  storedName: { type: DataTypes.STRING(500), allowNull: false, field: 'stored_name' },
  filePath: { type: DataTypes.STRING(1000), allowNull: false, field: 'file_path' },
  mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
  fileSize: { type: DataTypes.INTEGER.UNSIGNED, field: 'file_size' },
  uploadedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'uploaded_by' },
  createdBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'created_by' },
  updatedBy: { type: DataTypes.INTEGER.UNSIGNED, field: 'updated_by' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, { tableName: 'files', timestamps: true, underscored: true });

module.exports = File;
