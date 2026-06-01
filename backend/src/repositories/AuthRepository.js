const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthRepository {
  constructor(db) {
    this.db = db;
  }

  // User management
  createUser({ firstName, lastName, email, password }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = this.db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
      VALUES (?, ?, ?, ?, 1, 1, 1)
    `).run(firstName, lastName, email, passwordHash);
    
    return this.getUserById(result.lastInsertRowid);
  }

  getUserById(id) {
    const user = this.db.prepare(`
      SELECT id, first_name, last_name, email, is_active, created_at, updated_at
      FROM users WHERE id = ? AND is_active = 1
    `).get(id);
    return user || null;
  }

  getUserByEmail(email) {
    const user = this.db.prepare(`
      SELECT id, first_name, last_name, email, password_hash, is_active, created_by, updated_by, created_at, updated_at
      FROM users WHERE email = ? AND is_active = 1
    `).get(email);
    return user || null;
  }

  updateUser(id, data) {
    const fields = [];
    const params = [];
    
    if (data.firstName !== undefined) { fields.push('first_name = ?'); params.push(data.firstName); }
    if (data.lastName !== undefined) { fields.push('last_name = ?'); params.push(data.lastName); }
    if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }
    
    if (fields.length === 0) return this.getUserById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.getUserById(id);
  }

  // Role management
  getRoles() {
    return this.db.prepare('SELECT * FROM roles ORDER BY name ASC').all();
  }

  getRoleById(id) {
    return this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  }

  getRoleByName(name) {
    return this.db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
  }

  assignRoleToUser(userId, roleId, assignedBy = 1) {
    try {
      this.db.prepare(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (?, ?, ?)
      `).run(userId, roleId, assignedBy);
      return true;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return false; // Role already assigned
      }
      throw error;
    }
  }

  getUserRoles(userId) {
    return this.db.prepare(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId);
  }

  // Permission management
  getPermissions() {
    return this.db.prepare('SELECT * FROM permissions ORDER BY resource, action').all();
  }

  getPermissionByName(name) {
    return this.db.prepare('SELECT * FROM permissions WHERE name = ?').get(name);
  }

  getUserPermissions(userId) {
    return this.db.prepare(`
      SELECT DISTINCT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId);
  }

  assignPermissionToRole(roleId, permissionId, grantedBy = 1) {
    try {
      this.db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (?, ?, ?)
      `).run(roleId, permissionId, grantedBy);
      return true;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return false;
      }
      throw error;
    }
  }

  // Refresh token management
  createRefreshToken(userId, tokenHash, expiresAt) {
    const result = this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, tokenHash, expiresAt);
    return result.lastInsertRowid;
  }

  getRefreshToken(tokenHash) {
    return this.db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? AND revoked_at IS NULL
    `).get(tokenHash);
  }

  revokeRefreshToken(tokenHash) {
    const result = this.db.prepare(`
      UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP 
      WHERE token_hash = ?
    `).run(tokenHash);
    return result.changes > 0;
  }

  revokeAllUserRefreshTokens(userId) {
    const result = this.db.prepare(`
      UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND revoked_at IS NULL
    `).run(userId);
    return result.changes > 0;
  }

  // Audit logging
  logAudit(userId, action, entity, entityId, oldValue, newValue, ipAddress, userAgent) {
    this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      action,
      entity,
      entityId || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress || null,
      userAgent || null
    );
    return true;
  }
}

module.exports = AuthRepository;