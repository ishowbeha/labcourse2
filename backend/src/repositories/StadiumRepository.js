const { Stadium, Section } = require('../models/Stadium');

class StadiumRepository {
  constructor(db) {
    this.db = db;
  }

  // ==================== STADIUM OPERATIONS ====================

  // Get all stadiums with pagination and filters
  getAllStadiums(page = 1, limit = 10, search = '', city = '', isActive = null) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR city LIKE ? OR address LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (city) {
      whereClause += ' AND city = ?';
      params.push(city);
    }

    if (isActive !== null) {
      whereClause += ' AND is_active = ?';
      params.push(isActive);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM stadiums ${whereClause}`;
    const { total } = this.db.prepare(countQuery).get(...params);

    // Get paginated results
    const query = `
      SELECT 
        s.id,
        s.name,
        s.city,
        s.country,
        s.capacity,
        s.address,
        s.image_url,
        s.description,
        s.is_active,
        s.created_by,
        s.updated_by,
        s.created_at,
        s.updated_at,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as updated_by_name
      FROM stadiums s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(query).all(...params, parseInt(limit), parseInt(offset));
    const stadiums = rows.map(row => new Stadium(row));

    return {
      stadiums,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get stadium by ID
  getStadiumById(id) {
    const query = `
      SELECT 
        s.*,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as updated_by_name
      FROM stadiums s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      WHERE s.id = ?
    `;
    const row = this.db.prepare(query).get(id);
    return row ? new Stadium(row) : null;
  }

  // Get stadium with sections
  getStadiumWithSections(id) {
    const stadium = this.getStadiumById(id);
    if (!stadium) return null;

    const sections = this.getSectionsByStadiumId(id);
    return { ...stadium, sections };
  }

  // Create new stadium
  createStadium(stadiumData, createdBy) {
    const query = `
      INSERT INTO stadiums (name, city, country, capacity, address, image_url, description, is_active, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    const result = this.db.prepare(query).run(
      stadiumData.name,
      stadiumData.city,
      stadiumData.country,
      stadiumData.capacity,
      stadiumData.address,
      stadiumData.imageUrl || null,
      stadiumData.description || null,
      createdBy,
      createdBy
    );
    return this.getStadiumById(result.lastInsertRowid);
  }

  // Update stadium
  updateStadium(id, stadiumData, updatedBy) {
    const query = `
      UPDATE stadiums 
      SET name = ?, city = ?, country = ?, capacity = ?, address = ?, image_url = ?, description = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    this.db.prepare(query).run(
      stadiumData.name,
      stadiumData.city,
      stadiumData.country,
      stadiumData.capacity,
      stadiumData.address,
      stadiumData.imageUrl || null,
      stadiumData.description || null,
      stadiumData.isActive !== undefined ? stadiumData.isActive : 1,
      updatedBy,
      id
    );
    return this.getStadiumById(id);
  }

  // Delete stadium (soft delete by setting is_active to 0)
  deleteStadium(id) {
    const query = `UPDATE stadiums SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(query).run(id);
    return this.getStadiumById(id);
  }

  // Hard delete stadium
  hardDeleteStadium(id) {
    const query = `DELETE FROM stadiums WHERE id = ?`;
    this.db.prepare(query).run(id);
    return { deleted: true, id };
  }

  // Get all unique cities for filter dropdown
  getAllCities() {
    const query = `SELECT DISTINCT city FROM stadiums WHERE is_active = 1 ORDER BY city`;
    return this.db.prepare(query).all().map(row => row.city);
  }

  // ==================== SECTION OPERATIONS ====================

  // Get all sections for a stadium
  getSectionsByStadiumId(stadiumId) {
    const query = `
      SELECT 
        sec.*,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as updated_by_name
      FROM sections sec
      LEFT JOIN users u1 ON sec.created_by = u1.id
      LEFT JOIN users u2 ON sec.updated_by = u2.id
      WHERE sec.stadium_id = ?
      ORDER BY sec.name
    `;
    const rows = this.db.prepare(query).all(stadiumId);
    return rows.map(row => new Section(row));
  }

  // Get section by ID
  getSectionById(id) {
    const query = `
      SELECT 
        sec.*,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as updated_by_name
      FROM sections sec
      LEFT JOIN users u1 ON sec.created_by = u1.id
      LEFT JOIN users u2 ON sec.updated_by = u2.id
      WHERE sec.id = ?
    `;
    const row = this.db.prepare(query).get(id);
    return row ? new Section(row) : null;
  }

  // Create new section
  createSection(stadiumId, sectionData, createdBy) {
    // Check if section name already exists for this stadium
    const existing = this.db.prepare('SELECT id FROM sections WHERE stadium_id = ? AND name = ?').get(stadiumId, sectionData.name);
    if (existing) {
      throw new Error('Section name already exists for this stadium');
    }

    const query = `
      INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = this.db.prepare(query).run(
      stadiumId,
      sectionData.name,
      sectionData.rowCount,
      sectionData.seatsPerRow,
      sectionData.priceMultiplier || 1.0,
      sectionData.description || null,
      createdBy,
      createdBy
    );
    return this.getSectionById(result.lastInsertRowid);
  }

  // Update section
  updateSection(id, sectionData, updatedBy) {
    const query = `
      UPDATE sections 
      SET name = ?, row_count = ?, seats_per_row = ?, price_multiplier = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    this.db.prepare(query).run(
      sectionData.name,
      sectionData.rowCount,
      sectionData.seatsPerRow,
      sectionData.priceMultiplier || 1.0,
      sectionData.description || null,
      updatedBy,
      id
    );
    return this.getSectionById(id);
  }

  // Delete section
  deleteSection(id) {
    const query = `DELETE FROM sections WHERE id = ?`;
    this.db.prepare(query).run(id);
    return { deleted: true, id };
  }

  // Get stadium capacity summary
  getStadiumCapacitySummary(stadiumId) {
    const query = `
      SELECT 
        COUNT(*) as total_sections,
        SUM(row_count * seats_per_row) as total_seats,
        AVG(price_multiplier) as avg_price_multiplier
      FROM sections
      WHERE stadium_id = ?
    `;
    return this.db.prepare(query).get(stadiumId);
  }
}

module.exports = StadiumRepository;