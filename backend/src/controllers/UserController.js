const UserService = require('../services/UserService');
const bcrypt = require('bcryptjs');

class UserController {
  constructor(db) {
    this.db = db;
    this.userService = new UserService(db);
  }

  // Update current user's profile
  async updateProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { firstName, lastName, email, currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, and email are required'
        });
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required'
          });
        }

        // Verify current password
        const [users] = await this.db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!validPassword) {
          return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user with new password
        await this.db.query(
          `UPDATE users SET 
            first_name = ?, last_name = ?, email = ?, 
            password_hash = ?, updated_at = NOW() 
          WHERE id = ?`,
          [firstName, lastName, email, hashedPassword, userId]
        );
      } else {
        // Update user without password change
        await this.db.query(
          `UPDATE users SET 
            first_name = ?, last_name = ?, email = ?, 
            updated_at = NOW() 
          WHERE id = ?`,
          [firstName, lastName, email, userId]
        );
      }

      // Get updated user data
      const [updatedUsers] = await this.db.query(
        'SELECT id, first_name, last_name, email, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      if (updatedUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found after update'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUsers[0]
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await this.userService.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  async createUser(req, res) {
    try {
      const userData = req.body;
      const user = await this.userService.createUser(userData);
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = await this.userService.updateUser(id, updateData);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.deleteUser(id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UserController;