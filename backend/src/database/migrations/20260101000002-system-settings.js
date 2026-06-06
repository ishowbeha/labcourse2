'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================================
    // SYSTEM_SETTINGS TABLE
    // Key-value store for all admin settings
    // ============================================
    await queryInterface.createTable('system_settings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      setting_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique setting identifier, e.g. site_name, tax_rate'
      },
      setting_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON-encoded value for complex types, plain string for simple ones'
      },
      setting_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
        comment: 'Type hint for frontend parsing'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Tab group: general, tickets, payment, coupons, notifications, appearance'
      },
      updated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Admin user who last updated this setting'
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

    await queryInterface.addIndex('system_settings', ['setting_key'], { unique: true, name: 'uq_setting_key' });
    await queryInterface.addIndex('system_settings', ['category'], { name: 'idx_setting_category' });

    // ============================================
    // SEED DEFAULT SETTINGS
    // ============================================
    const now = new Date();
    const defaults = [
      // General
      { setting_key: 'site_name',           setting_value: 'Stadium Tickets',                              setting_type: 'string',  category: 'general' },
      { setting_key: 'site_tagline',         setting_value: 'Your #1 destination for football tickets',     setting_type: 'string',  category: 'general' },
      { setting_key: 'default_currency',     setting_value: 'EUR',                                          setting_type: 'string',  category: 'general' },
      { setting_key: 'timezone',             setting_value: 'Europe/Berlin',                                setting_type: 'string',  category: 'general' },
      { setting_key: 'language',             setting_value: 'en',                                           setting_type: 'string',  category: 'general' },
      // Tickets & Orders
      { setting_key: 'max_tickets_per_order',  setting_value: '10',  setting_type: 'number',  category: 'tickets' },
      { setting_key: 'booking_window_days',    setting_value: '30',  setting_type: 'number',  category: 'tickets' },
      { setting_key: 'auto_cancel_minutes',    setting_value: '30',  setting_type: 'number',  category: 'tickets' },
      { setting_key: 'refund_enabled',         setting_value: 'true', setting_type: 'boolean', category: 'tickets' },
      // Payment
      { setting_key: 'stripe_test_mode',          setting_value: 'true', setting_type: 'boolean', category: 'payment' },
      { setting_key: 'stripe_publishable_key',     setting_value: '',     setting_type: 'string',  category: 'payment' },
      { setting_key: 'stripe_secret_key',          setting_value: '',     setting_type: 'string',  category: 'payment' },
      { setting_key: 'tax_rate',                   setting_value: '20',   setting_type: 'number',  category: 'payment' },
      // Coupons
      { setting_key: 'max_discount_percent',    setting_value: '50',    setting_type: 'number',  category: 'coupons' },
      { setting_key: 'allow_stacking_coupons',  setting_value: 'false', setting_type: 'boolean', category: 'coupons' },
      { setting_key: 'coupon_expiry_days',       setting_value: '30',    setting_type: 'number',  category: 'coupons' },
      // Notifications
      { setting_key: 'email_notifications_enabled', setting_value: 'true',                        setting_type: 'boolean', category: 'notifications' },
      { setting_key: 'admin_alert_emails',           setting_value: 'true',                        setting_type: 'boolean', category: 'notifications' },
      { setting_key: 'admin_email',                  setting_value: 'admin@stadium.com',         setting_type: 'string',  category: 'notifications' },
      { setting_key: 'smtp_host',                    setting_value: 'smtp.gmail.com',              setting_type: 'string',  category: 'notifications' },
      { setting_key: 'smtp_port',                    setting_value: '587',                         setting_type: 'number',  category: 'notifications' },
      { setting_key: 'smtp_user',                    setting_value: '',                            setting_type: 'string',  category: 'notifications' },
      { setting_key: 'smtp_password',                setting_value: '',                            setting_type: 'string',  category: 'notifications' },
      { setting_key: 'smtp_sender',                  setting_value: 'noreply@stadiumtickets.com', setting_type: 'string',  category: 'notifications' },
      // Appearance
      { setting_key: 'dark_mode',        setting_value: 'false',                                     setting_type: 'boolean', category: 'appearance' },
      { setting_key: 'primary_color',    setting_value: '#3498db',                                   setting_type: 'string',  category: 'appearance' },
      { setting_key: 'accent_color',     setting_value: '#2ecc71',                                   setting_type: 'string',  category: 'appearance' },
      { setting_key: 'homepage_banner',  setting_value: 'Book your seats for the biggest matches!',  setting_type: 'string',  category: 'appearance' },
    ].map(row => ({ ...row, updated_by: null, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('system_settings', defaults);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_settings');
  }
};
