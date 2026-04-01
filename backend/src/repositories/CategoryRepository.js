const Category = require('../models/Category');

class CategoryRepository {
  constructor(db) {
    this.categoryModel = new Category(db);
  }

  findAll() {
    try {
      return this.categoryModel.findAll();
    } catch (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }
  }

  findById(id) {
    try {
      const category = this.categoryModel.findById(id);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      throw new Error(`Error fetching category: ${error.message}`);
    }
  }

  create(categoryData) {
    try {
      return this.categoryModel.create(categoryData);
    } catch (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  update(id, categoryData) {
    try {
      const category = this.categoryModel.update(id, categoryData);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      throw new Error(`Error updating category: ${error.message}`);
    }
  }

  delete(id) {
    try {
      return this.categoryModel.delete(id);
    } catch (error) {
      throw new Error(`Error deleting category: ${error.message}`);
    }
  }
}

module.exports = CategoryRepository;