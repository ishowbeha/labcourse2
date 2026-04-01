import CategoryRepository from '../repositories/CategoryRepository';

class CategoryService {
  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async getAllCategories() {
    try {
      const result = await this.categoryRepository.getAllCategories();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch categories');
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  async getCategoryById(id) {
    try {
      const result = await this.categoryRepository.getCategoryById(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch category');
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch category');
    }
  }

  async createCategory(categoryData) {
    try {
      const result = await this.categoryRepository.createCategory(categoryData);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to create category');
    } catch (error) {
      throw new Error(error.message || 'Failed to create category');
    }
  }

  async updateCategory(id, categoryData) {
    try {
      const result = await this.categoryRepository.updateCategory(id, categoryData);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to update category');
    } catch (error) {
      throw new Error(error.message || 'Failed to update category');
    }
  }

  async deleteCategory(id) {
    try {
      const result = await this.categoryRepository.deleteCategory(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to delete category');
    } catch (error) {
      throw new Error(error.message || 'Failed to delete category');
    }
  }
}

export default CategoryService;