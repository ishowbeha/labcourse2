const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // User management
  async createUser({ firstName, lastName, email, password }) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const [result] = await this.pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by) VALUES (?, ?, ?, ?, 1, 1, 1)',
      [firstName, lastName, email, passwordHash]
    );
    return this.getUserById(result.insertId);
  }

  async getUserById(id) {
    const [users] = await this.pool.query(
      'SELECT id, first_name, last_name, email, is_active, created_at, updated_at FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  }

  async getUserByEmail(email) {
    const [users] = await this.pool.query(
      'SELECT id, first_name, last_name, email, password_hash, is_active, created_by, updated_by, created_at, updated_at FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    return users.length > 0 ? users[0] : null;
  }

  async updateUser(id, data) {
    const fields = [];
    const params = [];

    if (data.firstName !== undefined) { fields.push('first_name = ?'); params.push(data.firstName); }
    if (data.lastName !== undefined) { fields.push('last_name = ?'); params.push(data.lastName); }
    if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }

    if (fields.length === 0) return this.getUserById(id);

    fields.push('updated_at = NOW()');
    params.push(id);

    await this.pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.getUserById(id);
  }

  // Role management
  async getRoles() {
    const [rows] = await this.pool.query('SELECT * FROM roles ORDER BY name ASC');
    return rows;
  }

  async getRoleById(id) {
    const [rows] = await this.pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getRoleByName(name) {
    const [rows] = await this.pool.query('SELECT * FROM roles WHERE name = ?', [name]);
    return rows.length > 0 ? rows[0] : null;
  }

  async assignRoleToUser(userId, roleId, assignedBy = 1) {
    try {
      await this.pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
        [userId, roleId, assignedBy]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return false; // Role already assigned
      }
      throw error;
    }
  }

  async getUserRoles(userId) {
    const [rows] = await this.pool.query(
      'SELECT r.* FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
      [userId]
    );
    return rows;
  }

  // Permission management
  async getPermissions() {
    const [rows] = await this.pool.query('SELECT * FROM permissions ORDER BY resource, action');
    return rows;
  }

  async getPermissionByName(name) {
    const [rows] = await this.pool.query('SELECT * FROM permissions WHERE name = ?', [name]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getUserPermissions(userId) {
    const [rows] = await this.pool.query(`
      SELECT DISTINCT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `, [userId]);
    return rows;
  }

  async assignPermissionToRole(roleId, permissionId, grantedBy = 1) {
    try {
      await this.pool.query(
        'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES (?, ?, ?)',
        [roleId, permissionId, grantedBy]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw error;
    }
  }

  // Refresh token management
  async createRefreshToken(userId, tokenHash, expiresAt) {
    const [result] = await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  }

  async getRefreshToken(tokenHash) {
    const [rows] = await this.pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL',
      [tokenHash]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async revokeRefreshToken(tokenHash) {
    const [result] = await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );
    return result.affectedRows > 0;
  }

  async revokeAllUserRefreshTokens(userId) {
    const [result] = await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Audit logging
  async logAudit(userId, action, entity, entityId, oldValue, newValue, ipAddress, userAgent) {
    await this.pool.query(
      'INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId || null,
        action,
        entity,
        entityId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress || null,
        userAgent || null
      ]
    );
    return true;
  }
}

module.exports = AuthRepository;