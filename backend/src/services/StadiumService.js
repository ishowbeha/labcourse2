const StadiumRepository = require('../repositories/StadiumRepository');

class StadiumService {
  constructor(pool) {
    this.pool = pool;
    this.repository = new StadiumRepository(pool);
  }

  // ==================== STADIUM OPERATIONS ====================

  // Get all stadiums with pagination and filters
  async getAllStadiums(page = 1, limit = 10, search = '', city = '', isActive = null) {
    try {
      return await this.repository.getAllStadiums(page, limit, search, city, isActive);
    } catch (error) {
      throw new Error(`Failed to fetch stadiums: ${error.message}`);
    }
  }

  // Get stadium by ID
  async getStadiumById(id) {
    try {
      const stadium = await this.repository.getStadiumById(id);
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      return stadium;
    } catch (error) {
      throw new Error(`Failed to fetch stadium: ${error.message}`);
    }
  }

  // Get stadium with sections
  async getStadiumWithSections(id) {
    try {
      const stadium = await this.repository.getStadiumWithSections(id);
      if (!stadium) {
        throw new Error('Stadium not found');
      }
      return stadium;
    } catch (error) {
      throw new Error(`Failed to fetch stadium with sections: ${error.message}`);
    }
  }

  // Create new stadium
  async createStadium(stadiumData, createdBy) {
    try {
      // Validate required fields
      if (!stadiumData.name || !stadiumData.city || !stadiumData.country || !stadiumData.capacity) {
        throw new Error('Name, city, country, and capacity are required');
      }

      // Check if stadium name already exists
      const [existing] = await this.pool.query('SELECT id FROM stadiums WHERE name = ?', [stadiumData.name]);
      if (existing.length > 0) {
        throw new Error('Stadium name already exists');
      }

      return await this.repository.createStadium(stadiumData, createdBy);
    } catch (error) {
      throw new Error(`Failed to create stadium: ${error.message}`);
    }
  }

  // Update stadium
  async updateStadium(id, stadiumData, updatedBy) {
    try {
      // Check if stadium exists
      const existingStadium = await this.repository.getStadiumById(id);
      if (!existingStadium) {
        throw new Error('Stadium not found');
      }

      // Check if name is being changed and if it's already taken
      if (stadiumData.name && stadiumData.name !== existingStadium.name) {
        const [nameTaken] = await this.pool.query('SELECT id FROM stadiums WHERE name = ? AND id != ?', [stadiumData.name, id]);
        if (nameTaken.length > 0) {
          throw new Error('Stadium name already exists');
        }
      }

      return await this.repository.updateStadium(id, stadiumData, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update stadium: ${error.message}`);
    }
  }

  // Delete stadium (soft delete)
  async deleteStadium(id) {
    try {
      const stadium = await this.repository.getStadiumById(id);
      if (!stadium) {
        throw new Error('Stadium not found');
      }

      // Check if stadium has any matches
      const [matchesCount] = await this.pool.query('SELECT COUNT(*) as count FROM matches WHERE stadium_id = ?', [id]);
      if (matchesCount[0].count > 0) {
        throw new Error('Cannot delete stadium with existing matches');
      }

      return await this.repository.deleteStadium(id);
    } catch (error) {
      throw new Error(`Failed to delete stadium: ${error.message}`);
    }
  }

  // Hard delete stadium
  async hardDeleteStadium(id) {
    try {
      return await this.repository.hardDeleteStadium(id);
    } catch (error) {
      throw new Error(`Failed to hard delete stadium: ${error.message}`);
    }
  }

  // Get all unique cities
  async getAllCities() {
    try {
      return await this.repository.getAllCities();
    } catch (error) {
      throw new Error(`Failed to fetch cities: ${error.message}`);
    }
  }

  // ==================== SECTION OPERATIONS ====================

  // Get all sections for a stadium
  async getSectionsByStadiumId(stadiumId) {
    try {
      return await this.repository.getSectionsByStadiumId(stadiumId);
    } catch (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }
  }

  // Get section by ID
  async getSectionById(id) {
    try {
      const section = await this.repository.getSectionById(id);
      if (!section) {
        throw new Error('Section not found');
      }
      return section;
    } catch (error) {
      throw new Error(`Failed to fetch section: ${error.message}`);
    }
  }

  // Create new section
  async createSection(stadiumId, sectionData, createdBy) {
    try {
      // Check if stadium exists
      const stadium = await this.repository.getStadiumById(stadiumId);
      if (!stadium) {
        throw new Error('Stadium not found');
      }

      // Validate required fields
      if (!sectionData.name || !sectionData.rowCount || !sectionData.seatsPerRow) {
        throw new Error('Name, row count, and seats per row are required');
      }

      return await this.repository.createSection(stadiumId, sectionData, createdBy);
    } catch (error) {
      throw new Error(`Failed to create section: ${error.message}`);
    }
  }

  // Update section
  async updateSection(id, sectionData, updatedBy) {
    try {
      // Check if section exists
      const existingSection = await this.repository.getSectionById(id);
      if (!existingSection) {
        throw new Error('Section not found');
      }

      // Validate required fields
      if (!sectionData.name || !sectionData.rowCount || !sectionData.seatsPerRow) {
        throw new Error('Name, row count, and seats per row are required');
      }

      return await this.repository.updateSection(id, sectionData, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update section: ${error.message}`);
    }
  }

  // Delete section
  async deleteSection(id) {
    try {
      const section = await this.repository.getSectionById(id);
      if (!section) {
        throw new Error('Section not found');
      }

      // Check if section has any tickets
      const [ticketsCount] = await this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE section_id = ?', [id]);
      if (ticketsCount[0].count > 0) {
        throw new Error('Cannot delete section with existing tickets');
      }

      return await this.repository.deleteSection(id);
    } catch (error) {
      throw new Error(`Failed to delete section: ${error.message}`);
    }
  }

  // Get stadium capacity summary
  async getStadiumCapacitySummary(stadiumId) {
    try {
      return await this.repository.getStadiumCapacitySummary(stadiumId);
    } catch (error) {
      throw new Error(`Failed to fetch capacity summary: ${error.message}`);
    }
  }
}

module.exports = StadiumService;