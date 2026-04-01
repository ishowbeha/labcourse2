const User = require('../models/User');

class UserRepository {
  constructor(db) {
    this.userModel = new User(db);
  }

  findAll() {
    try {
      return this.userModel.findAll();
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  findById(id) {
    try {
      const user = this.userModel.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  findByEmail(email) {
    try {
      return this.userModel.findByEmail(email);
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  create(userData) {
    try {
      return this.userModel.create(userData);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  update(id, updateData) {
    try {
      const user = this.userModel.update(id, updateData);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  delete(id) {
    try {
      const user = this.userModel.delete(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  hardDelete(id) {
    try {
      const result = this.userModel.hardDelete(id);
      if (!result) {
        throw new Error('User not found');
      }
      return result;
    } catch (error) {
      throw new Error(`Error hard deleting user: ${error.message}`);
    }
  }
}

module.exports = UserRepository;