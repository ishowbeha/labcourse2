const express = require('express');
const StadiumController = require('../controllers/StadiumController');
const { authenticate, requireRole } = require('../middleware/auth');

const createStadiumRoutes = (db) => {
  const router = express.Router();
  const controller = new StadiumController(db);

  // All stadium routes require authentication and admin role
  router.use(authenticate);
  router.use(requireRole(['admin']));

  // ==================== STADIUM ROUTES ====================
  
  // Get all stadiums with pagination and filters
  router.get('/', controller.getAllStadiums.bind(controller));
  
  // Get all unique cities for filter dropdown
  router.get('/meta/cities', controller.getAllCities.bind(controller));
  
  // Get stadium by ID
  router.get('/:id', controller.getStadiumById.bind(controller));
  
  // Get stadium with sections
  router.get('/:id/sections', controller.getStadiumWithSections.bind(controller));
  
  // Get stadium capacity summary
  router.get('/:id/summary', controller.getStadiumCapacitySummary.bind(controller));
  
  // Create new stadium
  router.post('/', controller.createStadium.bind(controller));
  
  // Update stadium
  router.put('/:id', controller.updateStadium.bind(controller));
  
  // Delete stadium (soft delete)
  router.delete('/:id', controller.deleteStadium.bind(controller));
  
  // Hard delete stadium
  router.delete('/:id/permanent', controller.hardDeleteStadium.bind(controller));

  // ==================== SECTION ROUTES ====================
  
  // Get all sections for a stadium
  router.get('/:stadiumId/sections', controller.getSectionsByStadiumId.bind(controller));
  
  // Get section by ID
  router.get('/:stadiumId/sections/:sectionId', controller.getSectionById.bind(controller));
  
  // Create new section
  router.post('/:stadiumId/sections', controller.createSection.bind(controller));
  
  // Update section
  router.put('/:stadiumId/sections/:sectionId', controller.updateSection.bind(controller));
  
  // Delete section
  router.delete('/:stadiumId/sections/:sectionId', controller.deleteSection.bind(controller));

  return router;
};

module.exports = createStadiumRoutes;