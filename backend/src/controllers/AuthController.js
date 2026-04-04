const AuthService = require('../services/AuthService');

class AuthController {
  constructor(db) {
    this.authService = new AuthService(db);
  }

  // Register new user
  async register(req, res) {
    try {
      const userData = req.body;
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const refreshToken = req.body.refreshToken;
      const result = await this.authService.logout(refreshToken);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const refreshToken = req.body.refreshToken;
      const result = await this.authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const result = await this.authService.getProfile(userId);
      
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

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;
      const result = await this.authService.updateProfile(userId, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all roles
  async getRoles(req, res) {
    try {
      const roles = await this.authService.getRoles();
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all permissions
  async getPermissions(req, res) {
    try {
      const permissions = await this.authService.getPermissions();
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AuthController;