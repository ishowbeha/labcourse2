class Category {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    return this.db.prepare('SELECT * FROM categories ORDER BY name').all();
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  create({ name, description = '' }) {
    const stmt = this.db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const result = stmt.run(name, description);
    return this.findById(result.lastInsertRowid);
  }

  update(id, { name, description }) {
    const stmt = this.db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?');
    stmt.run(name, description, id);
    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
    stmt.run(id);
    return true;
  }
}

module.exports = Category;