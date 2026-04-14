const StadiumService = require('../services/StadiumService');

class StadiumController {
  constructor(db) {
    this.db = db;
    this.service = new StadiumService(db);
  }

  // ==================== STADIUM OPERATIONS ====================

  // Get all stadiums with pagination and filters
  async getAllStadiums(req, res, next) {
    try {
      const { page = 1, limit = 10, search = '', city = '', isActive = '' } = req.query;
      const result = await this.service.getAllStadiums(
        parseInt(page),
        parseInt(limit),
        search,
        city,
        isActive === '' ? null : parseInt(isActive)
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get stadium by ID
  async getStadiumById(req, res, next) {
    try {
      const { id } = req.params;
      const stadium = await this.service.getStadiumById(id);
      res.json({
        success: true,
        data: stadium
      });
    } catch (error) {
      next(error);
    }
  }

  // Get stadium with sections
  async getStadiumWithSections(req, res, next) {
    try {
      const { id } = req.params;
      const stadium = await this.service.getStadiumWithSections(id);
      res.json({
        success: true,
        data: stadium
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new stadium
  async createStadium(req, res, next) {
    try {
      const { name, city, country, capacity, address, imageUrl, description, isActive } = req.body;
      const createdBy = req.user?.id || 1; // Default to system admin

      if (!name || !city || !country || !capacity) {
        return res.status(400).json({
          success: false,
          message: 'Name, city, country, and capacity are required'
        });
      }

      const stadium = await this.service.createStadium(
        { name, city, country, capacity, address, imageUrl, description, isActive },
        createdBy
      );

      res.status(201).json({
        success: true,
        data: stadium
      });
    } catch (error) {
      next(error);
    }
  }

  // Update stadium
  async updateStadium(req, res, next) {
    try {
      const { id } = req.params;
      const { name, city, country, capacity, address, imageUrl, description, isActive } = req.body;
      const updatedBy = req.user?.id || 1;

      const stadium = await this.service.updateStadium(
        id,
        { name, city, country, capacity, address, imageUrl, description, isActive },
        updatedBy
      );

      res.json({
        success: true,
        data: stadium
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete stadium (soft delete)
  async deleteStadium(req, res, next) {
    try {
      const { id } = req.params;
      const stadium = await this.service.deleteStadium(id);
      res.json({
        success: true,
        data: stadium
      });
    } catch (error) {
      next(error);
    }
  }

  // Hard delete stadium
  async hardDeleteStadium(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.hardDeleteStadium(id);
      res.json({
        success: true,
        message: 'Stadium permanently deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all unique cities
  async getAllCities(req, res, next) {
    try {
      const cities = await this.service.getAllCities();
      res.json({
        success: true,
        data: cities
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SECTION OPERATIONS ====================

  // Get all sections for a stadium
  async getSectionsByStadiumId(req, res, next) {
    try {
      const { id } = req.params;
      const sections = await this.service.getSectionsByStadiumId(id);
      res.json({
        success: true,
        data: sections
      });
    } catch (error) {
      next(error);
    }
  }

  // Get section by ID
  async getSectionById(req, res, next) {
    try {
      const { stadiumId, sectionId } = req.params;
      const section = await this.service.getSectionById(sectionId);
      
      // Verify section belongs to the stadium
      if (section.stadiumId !== parseInt(stadiumId)) {
        return res.status(404).json({
          success: false,
          message: 'Section not found in this stadium'
        });
      }

      res.json({
        success: true,
        data: section
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new section
  async createSection(req, res, next) {
    try {
      const { stadiumId } = req.params;
      const { name, rowCount, seatsPerRow, priceMultiplier, description } = req.body;
      const createdBy = req.user?.id || 1;

      if (!name || !rowCount || !seatsPerRow) {
        return res.status(400).json({
          success: false,
          message: 'Name, row count, and seats per row are required'
        });
      }

      const section = await this.service.createSection(
        parseInt(stadiumId),
        { name, rowCount, seatsPerRow, priceMultiplier, description },
        createdBy
      );

      res.status(201).json({
        success: true,
        data: section
      });
    } catch (error) {
      next(error);
    }
  }

  // Update section
  async updateSection(req, res, next) {
    try {
      const { sectionId } = req.params;
      const { name, rowCount, seatsPerRow, priceMultiplier, description } = req.body;
      const updatedBy = req.user?.id || 1;

      if (!name || !rowCount || !seatsPerRow) {
        return res.status(400).json({
          success: false,
          message: 'Name, row count, and seats per row are required'
        });
      }

      const section = await this.service.updateSection(
        parseInt(sectionId),
        { name, rowCount, seatsPerRow, priceMultiplier, description },
        updatedBy
      );

      res.json({
        success: true,
        data: section
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete section
  async deleteSection(req, res, next) {
    try {
      const { sectionId } = req.params;
      await this.service.deleteSection(parseInt(sectionId));
      res.json({
        success: true,
        message: 'Section deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get stadium capacity summary
  async getStadiumCapacitySummary(req, res, next) {
    try {
      const { id } = req.params;
      const summary = await this.service.getStadiumCapacitySummary(id);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StadiumController;