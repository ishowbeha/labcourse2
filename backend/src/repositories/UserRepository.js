class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findAll() {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, first_name, last_name, email, is_active, created_at, updated_at FROM users WHERE is_active = 1'
      );
      return rows;
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, first_name, last_name, email, is_active, created_at, updated_at FROM users WHERE id = ? AND is_active = 1',
        [id]
      );
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  async findByEmail(email) {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, first_name, last_name, email, password_hash, is_active, created_at, updated_at FROM users WHERE email = ? AND is_active = 1',
        [email]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  async create({ firstName, lastName, email, password }) {
    try {
      const [result] = await this.pool.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_by, updated_by) VALUES (?, ?, ?, ?, 1, 1, 1)',
        [firstName, lastName, email, password]
      );
      return this.findById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async update(id, { firstName, lastName, email, isActive }) {
    try {
      const [userRows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      const fields = [];
      const params = [];

      if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
      if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
      if (email !== undefined) { fields.push('email = ?'); params.push(email); }
      if (isActive !== undefined) { fields.push('is_active = ?'); params.push(isActive); }

      if (fields.length > 0) {
        fields.push('updated_at = NOW()');
        params.push(id);
        await this.pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
      }

      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const [userRows] = await this.pool.query('SELECT id FROM users WHERE id = ?', [id]);
      if (userRows.length === 0) {
        throw new Error('User not found');
      }

      await this.pool.query('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  async hardDelete(id) {
    try {
      const [result] = await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error hard deleting user: ${error.message}`);
    }
  }
}

module.exports = UserRepository;