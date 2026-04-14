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
      
      // Set refreshToken as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Remove refreshToken from response body (it's in the cookie)
      const { refreshToken, ...resultWithoutRefresh } = result;
      
      res.json({
        success: true,
        message: 'Login successful',
        data: resultWithoutRefresh
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
      // Get refreshToken from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
      
      // Clear the refreshToken cookie
      res.clearCookie('refreshToken');
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      // Still clear cookie even if there's an error
      res.clearCookie('refreshToken');
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      // Get refreshToken from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      
      const result = await this.authService.refreshToken(refreshToken);
      
      // Set new refreshToken as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Remove refreshToken from response body (it's in the cookie)
      const { refreshToken: _, ...resultWithoutRefresh } = result;
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: resultWithoutRefresh
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