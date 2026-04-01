const express = require('express');
const CategoryController = require('../controllers/CategoryController');

const router = express.Router();

// Factory function to create router with database connection
const createCategoryRoutes = (db) => {
  const categoryController = new CategoryController(db);

  router.get('/', (req, res) => categoryController.getAllCategories(req, res));
  router.get('/:id', (req, res) => categoryController.getCategoryById(req, res));
  router.post('/', (req, res) => categoryController.createCategory(req, res));
  router.put('/:id', (req, res) => categoryController.updateCategory(req, res));
  router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res));

  return router;
};

module.exports = createCategoryRoutes;