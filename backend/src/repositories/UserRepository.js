const { User } = require('../models/mysql');

class UserRepository {
  constructor(sequelize) {
    this.sequelize = sequelize;
  }

  async findAll() {
    try {
      return User.findAll({
        where: { isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt', 'updatedAt']
      });
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const user = await User.findOne({
        where: { id, isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt', 'updatedAt']
      });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  async findByEmail(email) {
    try {
      return User.findOne({
        where: { email, isActive: true }
      });
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  async create({ firstName, lastName, email, password }) {
    try {
      const user = await User.create({
        firstName,
        lastName,
        email,
        passwordHash: password,
        isActive: true
      });
      return this.findById(user.id);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async update(id, { firstName, lastName, email, isActive }) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      await user.update({
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        email: email !== undefined ? email : user.email,
        isActive: isActive !== undefined ? isActive : user.isActive
      });
      
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      await user.update({ isActive: false });
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  async hardDelete(id) {
    try {
      const deleted = await User.destroy({ where: { id } });
      return deleted > 0;
    } catch (error) {
      throw new Error(`Error hard deleting user: ${error.message}`);
    }
  }
}

module.exports = UserRepository;
