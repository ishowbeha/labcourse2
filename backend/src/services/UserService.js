const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');

class UserService {
  constructor(db) {
    this.userRepository = new UserRepository(db);
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async getUserById(id) {
    return await this.userRepository.findById(id);
  }

  async createUser(userData) {
    // Validate input
    const { firstName, lastName, email, password } = userData;
    if (!firstName || !lastName || !email || !password) {
      throw new Error('First name, last name, email, and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    return user;
  }

  async updateUser(id, updateData) {
    // If updating password, hash it
    const data = { ...updateData };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return await this.userRepository.update(id, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      is_active: data.is_active
    });
  }

  async deleteUser(id) {
    return await this.userRepository.delete(id);
  }

  async authenticateUser(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = UserService;