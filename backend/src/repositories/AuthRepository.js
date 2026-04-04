const bcrypt = require('bcryptjs');

class AuthRepository {
  constructor(db) {
    this.db = db;
  }

  // User management
  createUser({ firstName, lastName, email, password }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = this.db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
      VALUES (?, ?, ?, ?, 1, 1, 1)
    `);
    const result = stmt.run(firstName, lastName, email, passwordHash);
    return this.getUserById(result.lastInsertRowid);
  }

  getUserById(id) {
    return this.db.prepare(`
      SELECT id, first_name, last_name, email, is_active, created_at, updated_at
      FROM users WHERE id = ? AND is_active = 1
    `).get(id);
  }

  getUserByEmail(email) {
    return this.db.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).get(email);
  }

  updateUser(id, data) {
    const stmt = this.db.prepare(`
      UPDATE users SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.firstName, data.lastName, data.email, id);
    return this.getUserById(id);
  }

  // Role management
  getRoles() {
    return this.db.prepare('SELECT * FROM roles ORDER BY name').all();
  }

  getRoleById(id) {
    return this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  }

  getRoleByName(name) {
    return this.db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
  }

  assignRoleToUser(userId, roleId, assignedBy = 1) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (?, ?, ?)
      `);
      stmt.run(userId, roleId, assignedBy);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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
      const stmt = this.db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (?, ?, ?)
      `);
      stmt.run(roleId, permissionId, grantedBy);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return false; // Permission already assigned
      }
      throw error;
    }
  }

  // Refresh token management
  createRefreshToken(userId, tokenHash, expiresAt) {
    const stmt = this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(userId, tokenHash, expiresAt);
    return result.lastInsertRowid;
  }

  getRefreshToken(tokenHash) {
    return this.db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    `).get(tokenHash);
  }

  revokeRefreshToken(tokenHash) {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = ?
    `);
    stmt.run(tokenHash);
    return true;
  }

  revokeAllUserRefreshTokens(userId) {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL
    `);
    stmt.run(userId);
    return true;
  }

  // Audit logging
  logAudit(userId, action, entity, entityId, oldValue, newValue, ipAddress, userAgent) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, action, entity, entityId, 
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress, userAgent);
    return true;
  }
}

module.exports = AuthRepository;