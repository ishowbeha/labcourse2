const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuthRepository = require('../repositories/AuthRepository');

class AuthService {
  constructor(db) {
    this.authRepository = new AuthRepository(db);
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshTokenExpiresIn = 30; // days
  }

  // Register new user
  async register(userData) {
    const { firstName, lastName, email, password, role = 'user' } = userData;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All fields are required');
    }

    // Check if user already exists
    const existingUser = this.authRepository.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = this.authRepository.createUser({
      firstName,
      lastName,
      email,
      password
    });

    // Assign default role
    const defaultRole = this.authRepository.getRoleByName(role);
    if (defaultRole) {
      this.authRepository.assignRoleToUser(user.id, defaultRole.id);
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Log audit
    this.authRepository.logAudit(
      user.id,
      'register',
      'user',
      user.id,
      null,
      { email: user.email },
      null,
      null
    );

    return {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      },
      ...tokens
    };
  }

  // Login user
  async login(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Get user with password hash
    const user = this.authRepository.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = require('bcryptjs').compareSync(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Log audit
    this.authRepository.logAudit(
      user.id,
      'login',
      'user',
      user.id,
      null,
      null,
      null,
      null
    );

    return {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      },
      ...tokens
    };
  }

  // Logout user
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Revoke the token
    this.authRepository.revokeRefreshToken(tokenHash);

    return { message: 'Logged out successfully' };
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is in database and not revoked
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = this.authRepository.getRefreshToken(tokenHash);

    if (!storedToken) {
      throw new Error('Refresh token not found or revoked');
    }

    // Generate new tokens
    return this.generateTokens(decoded.userId);
  }

  // Get current user profile
  async getProfile(userId) {
    const user = this.authRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user roles
    const roles = this.authRepository.getUserRoles(userId);

    // Get user permissions
    const permissions = this.authRepository.getUserPermissions(userId);

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      roles: roles.map(r => r.name),
      permissions: permissions.map(p => p.name)
    };
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const user = this.authRepository.updateUser(userId, updateData);
    
    // Log audit
    this.authRepository.logAudit(
      userId,
      'update_profile',
      'user',
      userId,
      null,
      updateData,
      null,
      null
    );

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email
    };
  }

  // Get all roles
  async getRoles() {
    return this.authRepository.getRoles();
  }

  // Get all permissions
  async getPermissions() {
    return this.authRepository.getPermissions();
  }

  // Generate JWT tokens
  generateTokens(userId) {
    // Access token (short-lived)
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    // Refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
      this.jwtSecret,
      { expiresIn: `${this.refreshTokenExpiresIn}d` }
    );

    // Hash refresh token for storage
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresIn);

    // Store refresh token in database
    this.authRepository.createRefreshToken(userId, refreshTokenHash, expiresAt.toISOString());

    return {
      accessToken,
      refreshToken
    };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = AuthService;