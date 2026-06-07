'use strict';

/**
 * Aligns all tables with the academic schema specification:
 * - 3NF, foreign keys, indexes
 * - created_by, updated_by, created_at, updated_at on every table
 * - Restores canonical `settings` table (migrates from system_settings)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userRef = {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    const auditTimestamps = {
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    };

    const addColumnIfMissing = async (table, column, definition) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, definition);
      }
    };

    const addAuditPair = async (table) => {
      await addColumnIfMissing(table, 'created_by', userRef);
      await addColumnIfMissing(table, 'updated_by', userRef);
    };

    // ── 1. Junction tables: full audit columns ───────────────────────────
    await addAuditPair('user_roles');
    await addColumnIfMissing('user_roles', 'created_at', auditTimestamps.created_at);
    await addColumnIfMissing('user_roles', 'updated_at', auditTimestamps.updated_at);

    await addAuditPair('role_permissions');
    await addColumnIfMissing('role_permissions', 'created_at', auditTimestamps.created_at);
    await addColumnIfMissing('role_permissions', 'updated_at', auditTimestamps.updated_at);

    // ── 2. Audit logs: full audit + FK on user_id ────────────────────────
    await addAuditPair('audit_logs');
    await addColumnIfMissing('audit_logs', 'updated_at', auditTimestamps.updated_at);

    // ── 3. Coupons: updated_by ───────────────────────────────────────────
    await addColumnIfMissing('coupons', 'updated_by', userRef);

    // ── 4. Files: academic columns + audit ───────────────────────────────
    await addColumnIfMissing('files', 'entity', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Polymorphic entity type (e.g. user, stadium, match)',
    });
    await addColumnIfMissing('files', 'filename', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await addColumnIfMissing('files', 'uploaded_by', userRef);

    await queryInterface.sequelize.query(`
      UPDATE files SET
        entity = COALESCE(entity, entity_type),
        filename = COALESCE(filename, original_name, stored_name),
        uploaded_by = COALESCE(uploaded_by, user_id)
      WHERE entity IS NULL OR filename IS NULL OR uploaded_by IS NULL
    `);

    await addAuditPair('files');

    // ── 5. Foreign keys on domain tables (idempotent via raw SQL) ────────
    const fkStatements = [
      `ALTER TABLE audit_logs
         ADD CONSTRAINT fk_audit_logs_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE files
         ADD CONSTRAINT fk_files_uploaded_by
         FOREIGN KEY (uploaded_by) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE files
         ADD CONSTRAINT fk_files_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE reviews
         ADD CONSTRAINT fk_reviews_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE reviews
         ADD CONSTRAINT fk_reviews_match
         FOREIGN KEY (match_id) REFERENCES matches(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE reviews
         ADD CONSTRAINT fk_reviews_stadium
         FOREIGN KEY (stadium_id) REFERENCES stadiums(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE favorites
         ADD CONSTRAINT fk_favorites_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE favorites
         ADD CONSTRAINT fk_favorites_match
         FOREIGN KEY (match_id) REFERENCES matches(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE favorites
         ADD CONSTRAINT fk_favorites_stadium
         FOREIGN KEY (stadium_id) REFERENCES stadiums(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE addresses
         ADD CONSTRAINT fk_addresses_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE support_tickets
         ADD CONSTRAINT fk_support_tickets_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE support_tickets
         ADD CONSTRAINT fk_support_tickets_assigned
         FOREIGN KEY (assigned_to) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE event_logs
         ADD CONSTRAINT fk_event_logs_ticket
         FOREIGN KEY (ticket_id) REFERENCES tickets(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,

      `ALTER TABLE event_logs
         ADD CONSTRAINT fk_event_logs_match
         FOREIGN KEY (match_id) REFERENCES matches(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE event_logs
         ADD CONSTRAINT fk_event_logs_user
         FOREIGN KEY (user_id) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE tickets
         ADD CONSTRAINT fk_tickets_purchaser
         FOREIGN KEY (purchaser_id) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE coupons
         ADD CONSTRAINT fk_coupons_created_by
         FOREIGN KEY (created_by) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,

      `ALTER TABLE coupons
         ADD CONSTRAINT fk_coupons_updated_by
         FOREIGN KEY (updated_by) REFERENCES users(id)
         ON DELETE SET NULL ON UPDATE CASCADE`,
    ];

    for (const sql of fkStatements) {
      try {
        await queryInterface.sequelize.query(sql);
      } catch (err) {
        if (!err.message?.includes('Duplicate') && !err.message?.includes('already exists')) {
          console.warn('[migration 004] FK skipped:', err.message?.slice(0, 120));
        }
      }
    }

    // ── 6. order_items: nullable ticket_id (VIP / simple purchases) ──────
    try {
      await queryInterface.changeColumn('order_items', 'ticket_id', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      console.warn('[migration 004] order_items.ticket_id:', err.message?.slice(0, 120));
    }

    // ── 7. Restore canonical `settings` (academic spec) ──────────────────
    const tables = await queryInterface.showAllTables();
    const hasSettings = tables.map((t) => t.toLowerCase()).includes('settings');

    if (!hasSettings) {
      await queryInterface.createTable('settings', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        key: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        value: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        type: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'string',
        },
        category: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'general',
        },
        created_by: userRef,
        updated_by: userRef,
        ...auditTimestamps,
      });

      await queryInterface.addIndex('settings', ['key'], { unique: true, name: 'uq_settings_key' });
      await queryInterface.addIndex('settings', ['category'], { name: 'idx_settings_category' });
    }

    // Migrate system_settings → settings
    if (tables.map((t) => t.toLowerCase()).includes('system_settings')) {
      const [sysRows] = await queryInterface.sequelize.query('SELECT * FROM system_settings');

      for (const row of sysRows) {
        const [existing] = await queryInterface.sequelize.query(
          'SELECT id FROM settings WHERE `key` = ? LIMIT 1',
          { replacements: [row.setting_key] }
        );

        if (existing.length === 0) {
          await queryInterface.bulkInsert('settings', [{
            key: row.setting_key,
            value: row.setting_value != null ? String(row.setting_value) : null,
            description: `Category: ${row.category || 'general'}`,
            type: row.setting_type || 'string',
            category: row.category || 'general',
            created_by: row.created_by || null,
            updated_by: row.updated_by || null,
            created_at: row.created_at || new Date(),
            updated_at: row.updated_at || new Date(),
          }]);
        } else {
          await queryInterface.sequelize.query(
            `UPDATE settings SET
              value = ?, type = ?, category = ?,
              updated_by = ?, updated_at = NOW()
             WHERE \`key\` = ?`,
            {
              replacements: [
                row.setting_value != null ? String(row.setting_value) : null,
                row.setting_type || 'string',
                row.category || 'general',
                row.updated_by || null,
                row.setting_key,
              ],
            }
          );
        }
      }

      await queryInterface.dropTable('system_settings');
    }

    // ── 8. Additional indexes ────────────────────────────────────────────
    const indexes = [
      ['refresh_tokens', ['user_id'], 'idx_refresh_tokens_user'],
      ['refresh_tokens', ['expires_at'], 'idx_refresh_tokens_expires'],
      ['notifications', ['user_id', 'is_read'], 'idx_notifications_user_read'],
      ['notifications', ['type'], 'idx_notifications_type'],
      ['order_items', ['order_id'], 'idx_order_items_order'],
      ['order_items', ['ticket_id'], 'idx_order_items_ticket'],
      ['payments', ['order_id'], 'idx_payments_order'],
      ['payments', ['status'], 'idx_payments_status'],
      ['files', ['entity', 'entity_id'], 'idx_files_entity'],
      ['files', ['uploaded_by'], 'idx_files_uploaded_by'],
      ['user_roles', ['assigned_at'], 'idx_user_roles_assigned_at'],
    ];

    for (const [table, fields, name] of indexes) {
      try {
        await queryInterface.addIndex(table, fields, { name });
      } catch (err) {
        if (!err.message?.includes('Duplicate')) {
          console.warn(`[migration 004] index ${name}:`, err.message?.slice(0, 80));
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Recreate system_settings from settings for rollback
    const tables = await queryInterface.showAllTables();
    const hasSettings = tables.map((t) => t.toLowerCase()).includes('settings');

    if (hasSettings && !tables.map((t) => t.toLowerCase()).includes('system_settings')) {
      await queryInterface.createTable('system_settings', {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        setting_key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        setting_value: { type: Sequelize.TEXT, allowNull: true },
        setting_type: { type: Sequelize.STRING(20), defaultValue: 'string' },
        category: { type: Sequelize.STRING(50), defaultValue: 'general' },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        updated_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });

      const [rows] = await queryInterface.sequelize.query('SELECT * FROM settings');
      if (rows.length) {
        await queryInterface.bulkInsert('system_settings', rows.map((r) => ({
          setting_key: r.key,
          setting_value: r.value,
          setting_type: r.type || 'string',
          category: r.category || 'general',
          created_by: r.created_by,
          updated_by: r.updated_by,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })));
      }
    }
  },
};
