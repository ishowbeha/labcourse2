'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================================
    // 1. FILES TABLE (mandatory - uploads)
    // ============================================
    await queryInterface.createTable('files', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      original_name: { type: Sequelize.STRING(500), allowNull: false },
      stored_name: { type: Sequelize.STRING(500), allowNull: false },
      file_path: { type: Sequelize.STRING(1000), allowNull: false },
      mime_type: { type: Sequelize.STRING(100), allowNull: true },
      file_size: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      entity_type: { type: Sequelize.STRING(50), allowNull: true },
      entity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 2. REVIEWS TABLE
    // ============================================
    await queryInterface.createTable('reviews', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      stadium_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, defaultValue: 5 },
      comment: { type: Sequelize.TEXT, allowNull: true },
      is_approved: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 3. COUPONS TABLE
    // ============================================
    await queryInterface.createTable('coupons', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      description: { type: Sequelize.STRING(500), allowNull: true },
      discount_type: { type: Sequelize.ENUM('percentage', 'fixed'), allowNull: false, defaultValue: 'percentage' },
      discount_value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      min_order_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      max_uses: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true, defaultValue: 100 },
      used_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      valid_from: { type: Sequelize.DATE, allowNull: true },
      valid_until: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 4. SUPPORT_TICKETS TABLE
    // ============================================
    await queryInterface.createTable('support_tickets', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      subject: { type: Sequelize.STRING(500), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      priority: { type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false, defaultValue: 'medium' },
      status: { type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'), allowNull: false, defaultValue: 'open' },
      assigned_to: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 5. FAVORITES TABLE
    // ============================================
    await queryInterface.createTable('favorites', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      stadium_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 6. ADDRESSES TABLE
    // ============================================
    await queryInterface.createTable('addresses', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      label: { type: Sequelize.STRING(100), allowNull: true, defaultValue: 'Home' },
      street: { type: Sequelize.STRING(500), allowNull: false },
      city: { type: Sequelize.STRING(100), allowNull: false },
      state: { type: Sequelize.STRING(100), allowNull: true },
      zip_code: { type: Sequelize.STRING(20), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'Albania' },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 7. EVENT_LOGS TABLE (ticket scanning at entry)
    // ============================================
    await queryInterface.createTable('event_logs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      ticket_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      match_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      action: { type: Sequelize.ENUM('scanned_in', 'scanned_out', 'validated', 'rejected'), allowNull: false, defaultValue: 'scanned_in' },
      scanned_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      scanned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 8. API_LOGS TABLE (track external API calls)
    // ============================================
    await queryInterface.createTable('api_logs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      endpoint: { type: Sequelize.STRING(500), allowNull: false },
      method: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'GET' },
      status_code: { type: Sequelize.INTEGER, allowNull: true },
      response_time_ms: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      request_body: { type: Sequelize.JSON, allowNull: true },
      response_summary: { type: Sequelize.STRING(1000), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // ============================================
    // ADD INDEXES
    // ============================================
    await queryInterface.addIndex('files', ['user_id']);
    await queryInterface.addIndex('files', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('reviews', ['user_id']);
    await queryInterface.addIndex('reviews', ['match_id']);
    await queryInterface.addIndex('reviews', ['stadium_id']);
    await queryInterface.addIndex('coupons', ['is_active']);
    await queryInterface.addIndex('support_tickets', ['user_id']);
    await queryInterface.addIndex('support_tickets', ['status']);
    await queryInterface.addIndex('support_tickets', ['assigned_to']);
    await queryInterface.addIndex('favorites', ['user_id']);
    await queryInterface.addIndex('favorites', ['match_id']);
    await queryInterface.addIndex('favorites', ['stadium_id']);
    await queryInterface.addIndex('favorites', ['user_id', 'match_id'], { unique: true, name: 'uq_user_match_fav' });
    await queryInterface.addIndex('addresses', ['user_id']);
    await queryInterface.addIndex('event_logs', ['ticket_id']);
    await queryInterface.addIndex('event_logs', ['match_id']);
    await queryInterface.addIndex('api_logs', ['endpoint']);
    await queryInterface.addIndex('api_logs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_logs');
    await queryInterface.dropTable('event_logs');
    await queryInterface.dropTable('addresses');
    await queryInterface.dropTable('favorites');
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('coupons');
    await queryInterface.dropTable('reviews');
    await queryInterface.dropTable('files');
  }
};