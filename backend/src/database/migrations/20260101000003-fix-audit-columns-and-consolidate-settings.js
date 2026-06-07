'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userRef = {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    const addAuditColumns = async (table, { includeUpdatedAt = true } = {}) => {
      const tableDesc = await queryInterface.describeTable(table);

      if (!tableDesc.created_by) {
        await queryInterface.addColumn(table, 'created_by', userRef);
      }
      if (!tableDesc.updated_by) {
        await queryInterface.addColumn(table, 'updated_by', userRef);
      }
      if (includeUpdatedAt && !tableDesc.updated_at) {
        await queryInterface.addColumn(table, 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        });
      }
    };

    // ── Add missing audit columns on 8 tables ──────────────────────────────
    await addAuditColumns('refresh_tokens');
    await addAuditColumns('order_items');
    await addAuditColumns('event_logs');
    await addAuditColumns('favorites');
    await addAuditColumns('addresses', { includeUpdatedAt: false });
    await addAuditColumns('support_tickets', { includeUpdatedAt: false });
    await addAuditColumns('reviews', { includeUpdatedAt: false });

    // api_logs already has created_by — only add updated_by + updated_at
    const apiLogsDesc = await queryInterface.describeTable('api_logs');
    if (!apiLogsDesc.updated_by) {
      await queryInterface.addColumn('api_logs', 'updated_by', userRef);
    }
    if (!apiLogsDesc.updated_at) {
      await queryInterface.addColumn('api_logs', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      });
    }

    // system_settings has updated_by but was missing created_by
    const systemSettingsDesc = await queryInterface.describeTable('system_settings');
    if (!systemSettingsDesc.created_by) {
      await queryInterface.addColumn('system_settings', 'created_by', userRef);
    }

    // ── Consolidate legacy `settings` into `system_settings` ───────────────
    const tables = await queryInterface.showAllTables();
    const hasLegacySettings = tables.includes('settings') || tables.includes('Settings');

    if (hasLegacySettings) {
      const [legacyRows] = await queryInterface.sequelize.query('SELECT * FROM settings');

      for (const row of legacyRows) {
        const [existing] = await queryInterface.sequelize.query(
          'SELECT id FROM system_settings WHERE setting_key = ? LIMIT 1',
          { replacements: [row.key] }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert('system_settings', [{
            setting_key: row.key,
            setting_value: row.value != null ? String(row.value) : null,
            setting_type: row.type || 'string',
            category: 'general',
            created_by: row.created_by || null,
            updated_by: row.updated_by || null,
            created_at: row.created_at || new Date(),
            updated_at: row.updated_at || new Date(),
          }]);
        }
      }

      await queryInterface.dropTable('settings');
    }
  },

  async down(queryInterface, Sequelize) {
    const userRef = {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    };

    // Recreate legacy settings table (empty)
    await queryInterface.createTable('settings', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      value: { type: Sequelize.TEXT, allowNull: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      type: { type: Sequelize.STRING(20), defaultValue: 'string' },
      created_by: userRef,
      updated_by: userRef,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    const removeAuditColumns = async (table, { includeUpdatedAt = true } = {}) => {
      const tableDesc = await queryInterface.describeTable(table);
      if (tableDesc.updated_by) await queryInterface.removeColumn(table, 'updated_by');
      if (tableDesc.created_by) await queryInterface.removeColumn(table, 'created_by');
      if (includeUpdatedAt && tableDesc.updated_at) await queryInterface.removeColumn(table, 'updated_at');
    };

    await removeAuditColumns('refresh_tokens');
    await removeAuditColumns('order_items');
    await removeAuditColumns('event_logs');
    await removeAuditColumns('favorites');
    await removeAuditColumns('addresses', { includeUpdatedAt: false });
    await removeAuditColumns('support_tickets', { includeUpdatedAt: false });
    await removeAuditColumns('reviews', { includeUpdatedAt: false });

    const apiLogsDesc = await queryInterface.describeTable('api_logs');
    if (apiLogsDesc.updated_at) await queryInterface.removeColumn('api_logs', 'updated_at');
    if (apiLogsDesc.updated_by) await queryInterface.removeColumn('api_logs', 'updated_by');

    const systemSettingsDesc = await queryInterface.describeTable('system_settings');
    if (systemSettingsDesc.created_by) await queryInterface.removeColumn('system_settings', 'created_by');
  },
};
