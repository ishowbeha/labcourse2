class UserRepository {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    try {
      return this.db.prepare(`
        SELECT id, first_name, last_name, email, is_active, created_at, updated_at
        FROM users WHERE is_active = 1
      `).all();
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  findById(id) {
    try {
      const user = this.db.prepare(`
        SELECT id, first_name, last_name, email, is_active, created_at, updated_at
        FROM users WHERE id = ? AND is_active = 1
      `).get(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  findByEmail(email) {
    try {
      return this.db.prepare(`
        SELECT id, first_name, last_name, email, password_hash, is_active, created_at, updated_at
        FROM users WHERE email = ? AND is_active = 1
      `).get(email) || null;
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  create({ firstName, lastName, email, password }) {
    try {
      const result = this.db.prepare(`
        INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
        VALUES (?, ?, ?, ?, 1, 1, 1)
      `).run(firstName, lastName, email, password);
      
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  update(id, { firstName, lastName, email, isActive }) {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!user) {
        throw new Error('User not found');
      }

      const fields = [];
      const params = [];
      
      if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
      if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
      if (email !== undefined) { fields.push('email = ?'); params.push(email); }
      if (isActive !== undefined) { fields.push('is_active = ?'); params.push(isActive); }
      
      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
      
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  delete(id) {
    try {
      const user = this.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      this.db.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  hardDelete(id) {
    try {
      const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error hard deleting user: ${error.message}`);
    }
  }
}

module.exports = UserRepository;