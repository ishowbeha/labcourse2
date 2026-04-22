const bcrypt = require('bcryptjs');
const { User, Role, Permission, UserRole, RolePermission, RefreshToken, AuditLog, sequelize } = require('../models/mysql');

class AuthRepository {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  // User management
  async createUser({ firstName, lastName, email, password }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      isActive: true
    });
    return this.getUserById(user.id);
  }

  async getUserById(id) {
    return User.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt', 'updatedAt']
    });
  }

  async getUserByEmail(email) {
    return User.findOne({
      where: { email, isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'passwordHash', 'isActive', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt']
    });
  }

  async updateUser(id, data) {
    const user = await User.findByPk(id);
    if (!user) return null;
    
    await user.update({
      firstName: data.firstName || user.firstName,
      lastName: data.lastName || user.lastName,
      email: data.email || user.email
    });
    
    return this.getUserById(id);
  }

  // Role management
  async getRoles() {
    return Role.findAll({ order: [['name', 'ASC']] });
  }

  async getRoleById(id) {
    return Role.findByPk(id);
  }

  async getRoleByName(name) {
    return Role.findOne({ where: { name } });
  }

  async assignRoleToUser(userId, roleId, assignedBy = 1) {
    try {
      await UserRole.findOrCreate({
        where: { userId, roleId },
        defaults: { assignedBy }
      });
      return true;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return false; // Role already assigned
      }
      throw error;
    }
  }

  async getUserRoles(userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: Role }]
    });
    return user ? user.Roles : [];
  }

  // Permission management
  async getPermissions() {
    return Permission.findAll({ order: [['resource', 'ASC'], ['action', 'ASC']] });
  }

  async getPermissionByName(name) {
    return Permission.findOne({ where: { name } });
  }

  async getUserPermissions(userId) {
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        include: [{ model: Permission }]
      }]
    });
    
    if (!user || !user.Roles) return [];
    
    const permissions = new Set();
    user.Roles.forEach(role => {
      if (role.Permissions) {
        role.Permissions.forEach(perm => permissions.add(perm));
      }
    });
    
    return Array.from(permissions);
  }

  async assignPermissionToRole(roleId, permissionId, grantedBy = 1) {
    try {
      await RolePermission.findOrCreate({
        where: { roleId, permissionId },
        defaults: { grantedBy }
      });
      return true;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return false; // Permission already assigned
      }
      throw error;
    }
  }

  // Refresh token management
  async createRefreshToken(userId, tokenHash, expiresAt) {
    const refreshToken = await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt
    });
    return refreshToken.id;
  }

  async getRefreshToken(tokenHash) {
    return RefreshToken.findOne({
      where: {
        tokenHash,
        revokedAt: null
      }
    });
  }

  async revokeRefreshToken(tokenHash) {
    const result = await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { tokenHash } }
    );
    return result[0] > 0;
  }

  async revokeAllUserRefreshTokens(userId) {
    const result = await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: null } }
    );
    return result[0] > 0;
  }

  // Audit logging
  async logAudit(userId, action, entity, entityId, oldValue, newValue, ipAddress, userAgent) {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent
    });
    return true;
  }
}

module.exports = AuthRepository;
