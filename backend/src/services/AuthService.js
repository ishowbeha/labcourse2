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

  /**
   * Best-effort MongoDB activity logging (never throws)
   */
  async _logToMongo(userId, action, resourceType, resourceId, description, metadata = {}) {
    try {
      const MongoLogService = require('./MongoLogService');
      const service = new MongoLogService();
      await service.logActivity(userId, action, resourceType, resourceId, description, metadata);
    } catch (error) {
      // MongoDB logging is best-effort — silently ignore failures
    }
  }

  // Register new user
  async register(userData) {
    const { firstName, lastName, email, password, role = 'user' } = userData;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All fields are required');
    }

    // Check if user already exists
    const existingUser = await this.authRepository.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await this.authRepository.createUser({
      firstName,
      lastName,
      email,
      password
    });

    // Assign default role
    const defaultRole = await this.authRepository.getRoleByName(role);
    if (defaultRole) {
      await this.authRepository.assignRoleToUser(user.id, defaultRole.id);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Log audit to MySQL
    await this.authRepository.logAudit(
      user.id,
      'register',
      'user',
      user.id,
      null,
      { email: user.email },
      null,
      null
    );

    // Log to MongoDB
    await this._logToMongo(
      user.id,
      'register',
      'user',
      user.id,
      `User registered: ${user.email}`,
      { email: user.email }
    );

    return {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        isActive: user.is_active
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
    const user = await this.authRepository.getUserByEmail(email);
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
    const tokens = await this.generateTokens(user.id);

    // Log audit to MySQL
    await this.authRepository.logAudit(
      user.id,
      'login',
      'user',
      user.id,
      null,
      null,
      null,
      null
    );

    // Log to MongoDB
    await this._logToMongo(
      user.id,
      'login',
      'user',
      user.id,
      `User logged in: ${user.email}`,
      { email: user.email }
    );

    return {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        isActive: user.is_active
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
    await this.authRepository.revokeRefreshToken(tokenHash);

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
    const storedToken = await this.authRepository.getRefreshToken(tokenHash);

    if (!storedToken) {
      throw new Error('Refresh token not found or revoked');
    }

    // Generate new tokens
    return await this.generateTokens(decoded.userId);
  }

  // Get current user profile
  async getProfile(userId) {
    const user = await this.authRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user roles
    const roles = await this.authRepository.getUserRoles(userId);

    // Get user permissions
    const permissions = await this.authRepository.getUserPermissions(userId);

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      roles: Array.isArray(roles) ? roles.map(r => r.name) : [],
      permissions: Array.isArray(permissions) ? permissions.map(p => p.name) : []
    };
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const user = await this.authRepository.updateUser(userId, updateData);
    
    // Log audit
    await this.authRepository.logAudit(
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

  // Verify a refresh token cookie without rotating it (used by session heartbeat)
  async verifyRefreshTokenCookie(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      if (decoded.type !== 'refresh') return false;

      // Confirm it's still in the DB and not revoked
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await this.authRepository.getRefreshToken(tokenHash);
      return !!stored;
    } catch {
      return false;
    }
  }

  // Generate JWT tokens
  async generateTokens(userId) {
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

    // Format date for MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const mysqlDate = expiresAt.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

    // Store refresh token in database
    await this.authRepository.createRefreshToken(userId, refreshTokenHash, mysqlDate);

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