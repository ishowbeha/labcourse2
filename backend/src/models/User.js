class User {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    return this.db.prepare('SELECT id, username, email, role, isActive, createdAt, updatedAt FROM users WHERE isActive = 1').all();
  }

  findById(id) {
    return this.db.prepare('SELECT id, username, email, role, isActive, createdAt, updatedAt FROM users WHERE id = ? AND isActive = 1').get(id);
  }

  findByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  create({ username, email, password, role = 'user' }) {
    const stmt = this.db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(username, email, password, role);
    return this.findById(result.lastInsertRowid);
  }

  update(id, { username, email, role, isActive }) {
    const stmt = this.db.prepare(`
      UPDATE users SET 
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        isActive = COALESCE(?, isActive)
      WHERE id = ?
    `);
    stmt.run(username, email, role, isActive, id);
    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('UPDATE users SET isActive = 0 WHERE id = ?');
    stmt.run(id);
    return this.findById(id);
  }

  hardDelete(id) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
    return true;
  }
}

module.exports = User;