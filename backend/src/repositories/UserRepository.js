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
        SELECT * FROM users WHERE email = ? AND is_active = 1
      `).get(email);
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  create({ firstName, lastName, email, password }) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
        VALUES (?, ?, ?, ?, 1, 1, 1)
      `);
      const result = stmt.run(firstName, lastName, email, password);
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  update(id, { firstName, lastName, email, is_active }) {
    try {
      const stmt = this.db.prepare(`
        UPDATE users SET 
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(firstName, lastName, email, is_active, id);
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  delete(id) {
    try {
      const stmt = this.db.prepare(`
        UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(id);
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  hardDelete(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      stmt.run(id);
      return true;
    } catch (error) {
      throw new Error(`Error hard deleting user: ${error.message}`);
    }
  }
}

module.exports = UserRepository;