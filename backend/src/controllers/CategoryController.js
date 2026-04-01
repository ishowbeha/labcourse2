const CategoryService = require('../services/CategoryService');

class CategoryController {
  constructor(db) {
    this.categoryService = new CategoryService(db);
  }

  async getAllCategories(req, res) {
    try {
      const categories = await this.categoryService.getAllCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getCategoryById(id);
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  async createCategory(req, res) {
    try {
      const { name, description } = req.body;
      const category = await this.categoryService.createCategory(name, description);
      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const category = await this.categoryService.updateCategory(id, name, description);
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const result = await this.categoryService.deleteCategory(id);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = CategoryController;