'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================================
    // CORE AUTHENTICATION & AUTHORIZATION TABLES
    // ============================================

    // Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Roles table
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // UserRoles table (many-to-many)
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      assigned_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Permissions table
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // RolePermissions table (many-to-many)
    await queryInterface.createTable('role_permissions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      permission_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
        onDelete: 'CASCADE'
      },
      granted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      granted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // RefreshTokens table
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // NOTIFICATIONS & SETTINGS
    // ============================================

    // AuditLogs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      old_value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      new_value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Settings table
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(20),
        defaultValue: 'string'
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // STADIUM & TICKET MANAGEMENT TABLES
    // ============================================

    // Stadiums table
    await queryInterface.createTable('stadiums', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Sections table
    await queryInterface.createTable('sections', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      stadium_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'stadiums', key: 'id' },
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      row_count: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      seats_per_row: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price_multiplier: {
        type: Sequelize.FLOAT,
        defaultValue: 1.0
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Matches table
    await queryInterface.createTable('matches', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      home_team: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      away_team: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      stadium_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'stadiums', key: 'id' }
      },
      match_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      match_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      competition: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      round: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'live', 'completed', 'cancelled', 'postponed'),
        defaultValue: 'scheduled'
      },
      home_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      away_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      base_price: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      max_tickets_per_user: {
        type: Sequelize.INTEGER,
        defaultValue: 4
      },
      sale_start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sale_end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Tickets table
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      match_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'matches', key: 'id' },
        onDelete: 'CASCADE'
      },
      section_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'sections', key: 'id' }
      },
      row_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      seat_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('available', 'reserved', 'sold', 'cancelled'),
        defaultValue: 'available'
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      barcode: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      purchaser_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      purchased_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reserved_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Orders table
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      total_amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'paid', 'cancelled', 'refunded'),
        defaultValue: 'pending'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
        defaultValue: 'pending'
      },
      payment_reference: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      customer_email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      customer_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // OrderItems table
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE'
      },
      ticket_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tickets', key: 'id' }
      },
      unit_price: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      subtotal: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Payments table
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'orders', key: 'id' }
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'EUR'
      },
      method: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
        defaultValue: 'pending'
      },
      transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      gateway_reference: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      gateway_response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refunded_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refund_amount: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // CREATE INDEXES FOR PERFORMANCE
    // ============================================
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['is_active']);
    await queryInterface.addIndex('tickets', ['status']);
    await queryInterface.addIndex('tickets', ['purchaser_id']);
    await queryInterface.addIndex('matches', ['match_date']);
    await queryInterface.addIndex('matches', ['stadium_id']);
    await queryInterface.addIndex('matches', ['status']);
    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['entity', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], { unique: true });
    await queryInterface.addIndex('role_permissions', ['role_id', 'permission_id'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to avoid FK constraints
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('tickets');
    await queryInterface.dropTable('matches');
    await queryInterface.dropTable('sections');
    await queryInterface.dropTable('stadiums');
    await queryInterface.dropTable('settings');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('users');
  }
};