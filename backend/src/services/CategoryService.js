const CategoryRepository = require('../repositories/CategoryRepository');

class CategoryService {
  constructor(db) {
    this.categoryRepository = new CategoryRepository(db);
  }

  getAllCategories() {
    return this.categoryRepository.findAll();
  }

  getCategoryById(id) {
    return this.categoryRepository.findById(id);
  }

  createCategory(name, description) {
    // Validate input
    if (!name || name.trim() === '') {
      throw new Error('Category name is required');
    }

    return this.categoryRepository.create({ name, description: description || '' });
  }

  updateCategory(id, name, description) {
    // Validate input
    if (!name || name.trim() === '') {
      throw new Error('Category name is required');
    }

    return this.categoryRepository.update(id, { name, description: description || '' });
  }

  deleteCategory(id) {
    return this.categoryRepository.delete(id);
  }
}

module.exports = CategoryService;