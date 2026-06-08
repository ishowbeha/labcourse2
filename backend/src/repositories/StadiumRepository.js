const { Stadium, Section } = require('../models/Stadium');

class StadiumRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // ==================== STADIUM OPERATIONS ====================

  // Get all stadiums with pagination and filters
  async getAllStadiums(page = 1, limit = 10, search = '', city = '', isActive = null, options = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.city LIKE ? OR s.address LIKE ? OR s.country LIKE ? OR s.description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (city) {
      whereClause += ' AND s.city = ?';
      params.push(city);
    }

    if (isActive !== null) {
      whereClause += ' AND s.is_active = ?';
      params.push(isActive);
    }

    if (options.country) {
      whereClause += ' AND s.country LIKE ?';
      params.push(`%${options.country}%`);
    }

    if (options.capacityMin !== undefined && options.capacityMin !== '') {
      whereClause += ' AND s.capacity >= ?';
      params.push(parseInt(options.capacityMin));
    }

    if (options.capacityMax !== undefined && options.capacityMax !== '') {
      whereClause += ' AND s.capacity <= ?';
      params.push(parseInt(options.capacityMax));
    }

    let orderSql = 'ORDER BY s.created_at DESC';
    if (options.sortBy) {
      const allowedSortFields = {
        name: 's.name',
        capacity: 's.capacity',
        city: 's.city',
        country: 's.country'
      };
      const field = allowedSortFields[options.sortBy] || 's.created_at';
      const dir = (options.sortDir && options.sortDir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
      orderSql = `ORDER BY ${field} ${dir}`;
    }

    // Get total count
    const [countRows] = await this.pool.query(`SELECT COUNT(*) as total FROM stadiums s ${whereClause}`, params);
    const total = countRows[0].total;

    // Get paginated results
    const [rows] = await this.pool.query(`
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
        CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name
      FROM stadiums s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      ${whereClause}
      ${orderSql}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

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
  async getStadiumById(id) {
    const [rows] = await this.pool.query(`
      SELECT 
        s.*,
        CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name
      FROM stadiums s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      WHERE s.id = ?
    `, [id]);

    return rows.length > 0 ? new Stadium(rows[0]) : null;
  }

  // Get stadium with sections
  async getStadiumWithSections(id) {
    const stadium = await this.getStadiumById(id);
    if (!stadium) return null;

    const sections = await this.getSectionsByStadiumId(id);
    return { ...stadium, sections };
  }

  // Create new stadium
  async createStadium(stadiumData, createdBy) {
    const [result] = await this.pool.query(
      'INSERT INTO stadiums (name, city, country, capacity, address, image_url, description, is_active, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
      [
        stadiumData.name,
        stadiumData.city,
        stadiumData.country,
        stadiumData.capacity,
        stadiumData.address,
        stadiumData.imageUrl || null,
        stadiumData.description || null,
        createdBy,
        createdBy
      ]
    );
    return this.getStadiumById(result.insertId);
  }

  // Update stadium
  async updateStadium(id, stadiumData, updatedBy) {
    await this.pool.query(
      'UPDATE stadiums SET name = ?, city = ?, country = ?, capacity = ?, address = ?, image_url = ?, description = ?, is_active = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [
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
      ]
    );
    return this.getStadiumById(id);
  }

  // Delete stadium (soft delete by setting is_active to 0)
  async deleteStadium(id) {
    await this.pool.query('UPDATE stadiums SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
    return this.getStadiumById(id);
  }

  // Hard delete stadium
  async hardDeleteStadium(id) {
    await this.pool.query('DELETE FROM stadiums WHERE id = ?', [id]);
    return { deleted: true, id };
  }

  // Get all unique cities for filter dropdown
  async getAllCities() {
    const [rows] = await this.pool.query('SELECT DISTINCT city FROM stadiums WHERE is_active = 1 ORDER BY city');
    return rows.map(row => row.city);
  }

  // ==================== SECTION OPERATIONS ====================

  // Get all sections for a stadium
  async getSectionsByStadiumId(stadiumId) {
    const [rows] = await this.pool.query(`
      SELECT 
        sec.*,
        CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name
      FROM sections sec
      LEFT JOIN users u1 ON sec.created_by = u1.id
      LEFT JOIN users u2 ON sec.updated_by = u2.id
      WHERE sec.stadium_id = ?
      ORDER BY sec.name
    `, [stadiumId]);

    return rows.map(row => new Section(row));
  }

  // Get section by ID
  async getSectionById(id) {
    const [rows] = await this.pool.query(`
      SELECT 
        sec.*,
        CONCAT(u1.first_name, ' ', u1.last_name) as created_by_name,
        CONCAT(u2.first_name, ' ', u2.last_name) as updated_by_name
      FROM sections sec
      LEFT JOIN users u1 ON sec.created_by = u1.id
      LEFT JOIN users u2 ON sec.updated_by = u2.id
      WHERE sec.id = ?
    `, [id]);

    return rows.length > 0 ? new Section(rows[0]) : null;
  }

  // Create new section
  async createSection(stadiumId, sectionData, createdBy) {
    // Check if section name already exists for this stadium
    const [existing] = await this.pool.query(
      'SELECT id FROM sections WHERE stadium_id = ? AND name = ?',
      [stadiumId, sectionData.name]
    );
    if (existing.length > 0) {
      throw new Error('Section name already exists for this stadium');
    }

    const [result] = await this.pool.query(
      'INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        stadiumId,
        sectionData.name,
        sectionData.rowCount,
        sectionData.seatsPerRow,
        sectionData.priceMultiplier || 1.0,
        sectionData.description || null,
        createdBy,
        createdBy
      ]
    );
    return this.getSectionById(result.insertId);
  }

  // Update section
  async updateSection(id, sectionData, updatedBy) {
    await this.pool.query(
      'UPDATE sections SET name = ?, row_count = ?, seats_per_row = ?, price_multiplier = ?, description = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [
        sectionData.name,
        sectionData.rowCount,
        sectionData.seatsPerRow,
        sectionData.priceMultiplier || 1.0,
        sectionData.description || null,
        updatedBy,
        id
      ]
    );
    return this.getSectionById(id);
  }

  // Delete section
  async deleteSection(id) {
    await this.pool.query('DELETE FROM sections WHERE id = ?', [id]);
    return { deleted: true, id };
  }

  // Get stadium capacity summary
  async getStadiumCapacitySummary(stadiumId) {
    const [rows] = await this.pool.query(`
      SELECT 
        COUNT(*) as total_sections,
        SUM(row_count * seats_per_row) as total_seats,
        AVG(price_multiplier) as avg_price_multiplier
      FROM sections
      WHERE stadium_id = ?
    `, [stadiumId]);

    return rows[0];
  }
}

module.exports = StadiumRepository;