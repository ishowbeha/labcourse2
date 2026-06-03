'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if admin user already exists (idempotent seeding)
    const [existingUser] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@stadium.com' LIMIT 1`
    );

    let adminUserId;
    if (existingUser.length === 0) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      await queryInterface.bulkInsert('users', [{
        first_name: 'System',
        last_name: 'Admin',
        email: 'admin@stadium.com',
        password_hash: adminPassword,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      }], {});

      const [adminResult] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'admin@stadium.com' LIMIT 1`
      );
      adminUserId = adminResult[0].id;
    } else {
      adminUserId = existingUser[0].id;
    }

    // Create roles (skip if already exist by checking unique name)
    const roles = [
      { name: 'admin', description: 'System Administrator' },
      { name: 'user', description: 'Regular User' },
      { name: 'manager', description: 'Stadium Manager' },
      { name: 'ticket_agent', description: 'Ticket Sales Agent' },
      { name: 'finance', description: 'Finance Department' },
      { name: 'support', description: 'Customer Support' },
      { name: 'analyst', description: 'Data Analyst' },
      { name: 'moderator', description: 'Content Moderator' },
      { name: 'vip', description: 'VIP Customer' },
      { name: 'staff', description: 'Stadium Staff' }
    ];

    for (const role of roles) {
      const [existingRole] = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE name = '${role.name}' LIMIT 1`
      );
      if (existingRole.length === 0) {
        await queryInterface.bulkInsert('roles', [{
          ...role,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: new Date(),
          updated_at: new Date()
        }], {});
      }
    }

    // Get admin role ID
    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
    );
    const adminRoleId = adminRole[0].id;

    // Assign admin role to admin user (skip if already assigned)
    const [existingUserRole] = await queryInterface.sequelize.query(
      `SELECT id FROM user_roles WHERE user_id = ${adminUserId} AND role_id = ${adminRoleId} LIMIT 1`
    );
    if (existingUserRole.length === 0) {
      await queryInterface.bulkInsert('user_roles', [{
        user_id: adminUserId,
        role_id: adminRoleId,
        assigned_by: adminUserId,
        assigned_at: new Date()
      }], {});
    }

    // Create permissions (skip if already exist by checking unique name)
    const permissions = [
      { name: 'users.view', resource: 'users', action: 'view', description: 'View users' },
      { name: 'users.create', resource: 'users', action: 'create', description: 'Create users' },
      { name: 'users.edit', resource: 'users', action: 'edit', description: 'Edit users' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },
      { name: 'stadiums.view', resource: 'stadiums', action: 'view', description: 'View stadiums' },
      { name: 'stadiums.manage', resource: 'stadiums', action: 'manage', description: 'Manage stadiums' },
      { name: 'matches.view', resource: 'matches', action: 'view', description: 'View matches' },
      { name: 'matches.manage', resource: 'matches', action: 'manage', description: 'Manage matches' },
      { name: 'tickets.view', resource: 'tickets', action: 'view', description: 'View tickets' },
      { name: 'tickets.purchase', resource: 'tickets', action: 'purchase', description: 'Purchase tickets' },
      { name: 'tickets.manage', resource: 'tickets', action: 'manage', description: 'Manage tickets' },
      { name: 'orders.view', resource: 'orders', action: 'view', description: 'View orders' },
      { name: 'orders.manage', resource: 'orders', action: 'manage', description: 'Manage orders' },
      { name: 'reports.view', resource: 'reports', action: 'view', description: 'View reports' },
      { name: 'reports.generate', resource: 'reports', action: 'generate', description: 'Generate reports' },
      { name: 'settings.view', resource: 'settings', action: 'view', description: 'View settings' },
      { name: 'settings.edit', resource: 'settings', action: 'edit', description: 'Edit settings' },
      { name: 'audit_logs.view', resource: 'audit_logs', action: 'view', description: 'View audit logs' }
    ];

    for (const perm of permissions) {
      const [existingPerm] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE name = '${perm.name}' LIMIT 1`
      );
      if (existingPerm.length === 0) {
        await queryInterface.bulkInsert('permissions', [{
          ...perm,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: new Date(),
          updated_at: new Date()
        }], {});
      }
    }

    // Assign all permissions to admin role (skip if already assigned)
    const [allPermissions] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions`
    );
    for (const p of allPermissions) {
      const [existingRp] = await queryInterface.sequelize.query(
        `SELECT id FROM role_permissions WHERE role_id = ${adminRoleId} AND permission_id = ${p.id} LIMIT 1`
      );
      if (existingRp.length === 0) {
        await queryInterface.bulkInsert('role_permissions', [{
          role_id: adminRoleId,
          permission_id: p.id,
          granted_by: adminUserId,
          granted_at: new Date()
        }], {});
      }
    }

    // Create stadiums (skip if already exist by checking unique name)
    const stadiums = [
      { name: 'National Stadium (Air Albania Stadium)', city: 'Tirana', country: 'Albania', capacity: 22500, address: 'Rruga e Elbasanit', description: 'Home stadium of the Albania national team' },
      { name: 'Fadil Vokrri Stadium', city: 'Prishtina', country: 'Kosova', capacity: 13500, address: 'Bulevardi Bill Clinton', description: 'Home stadium of the Kosova national team' },
      { name: 'Loro Boriçi Stadium', city: 'Shkodër', country: 'Albania', capacity: 16000, address: 'Rruga Skenderbeu', description: 'Historic stadium in northern Albania' },
      { name: 'Selman Stërmasi Stadium', city: 'Tirana', country: 'Albania', capacity: 9500, address: 'Rruga e Kavajës', description: 'Home of KF Tirana' },
      { name: 'Partizani Stadium', city: 'Tirana', country: 'Albania', capacity: 8500, address: 'Parku i Liqenit', description: 'Home of FK Partizani' },
      { name: 'Gjirokastër Stadium', city: 'Gjirokastër', country: 'Albania', capacity: 8000, address: 'Rruga Eqrem Çabej', description: 'Stadium in the historic city' },
      { name: 'Korçë Stadium', city: 'Korçë', country: 'Albania', capacity: 12000, address: 'Bulevardi Fan Noli', description: 'Home of Skënderbeu' },
      { name: 'Mitrovica Stadium', city: 'Mitrovica', country: 'Kosova', capacity: 8500, address: 'Rruga Adem Jashari', description: 'Stadium in northern Kosova' },
      { name: 'Ferizaj Stadium', city: 'Ferizaj', country: 'Kosova', capacity: 6000, address: 'Bulevardi Dëshmorët e Kombit', description: 'Home of Ferizaj' },
      { name: 'Peja Stadium', city: 'Peja', country: 'Kosova', capacity: 7000, address: 'Rruga UÇK', description: 'Stadium in western Kosova' }
    ];

    for (const stadium of stadiums) {
      const [existingStadium] = await queryInterface.sequelize.query(
        `SELECT id FROM stadiums WHERE name = '${stadium.name.replace(/'/g, "\\'")}' LIMIT 1`
      );
      if (existingStadium.length === 0) {
        await queryInterface.bulkInsert('stadiums', [{
          ...stadium,
          is_active: true,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: new Date(),
          updated_at: new Date()
        }], {});
      }
    }

    // Get all stadium IDs dynamically (maps name -> id)
    const [allStadiums] = await queryInterface.sequelize.query(
      `SELECT id, name FROM stadiums`
    );
    const stadiumMap = {};
    for (const s of allStadiums) {
      stadiumMap[s.name] = s.id;
    }

    // Create matches (skip if already exist)
    // Only local league matches as static data — real fixtures come from API sync
    const matches = [
      // ===== FIFA World Cup 2026 (synced from API-Football) =====
      // These will be imported via "Sync Fixtures" button

      // ===== UEFA Nations League & Euro Qualifiers =====
      { home_team: 'Albania', away_team: 'Czech Republic', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-10-10', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 35 },
      { home_team: 'Kosova', away_team: 'Bosnia', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-10-11', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 22 },
      { home_team: 'Albania', away_team: 'Iceland', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-10-14', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 28 },
      { home_team: 'Kosova', away_team: 'Slovenia', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-10-15', match_time: '18:00', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 20 },
      { home_team: 'Albania', away_team: 'Wales', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-11-14', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 45 },
      { home_team: 'Kosova', away_team: 'Sweden', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-11-15', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 38 },

      // ===== Domestic Leagues =====
      { home_team: 'Tirana', away_team: 'Partizani', stadium_name: 'Selman Stërmasi Stadium', match_date: '2026-08-22', match_time: '18:00', competition: 'Kategoria Superiore', round: 'Matchday 1', base_price: 15 },
      { home_team: 'Skënderbeu', away_team: 'Tirana', stadium_name: 'Korçë Stadium', match_date: '2026-08-29', match_time: '19:30', competition: 'Kategoria Superiore', round: 'Matchday 2', base_price: 12 },
      { home_team: 'Prishtina', away_team: 'Drita', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-08-23', match_time: '20:00', competition: 'Football Superleague of Kosova', round: 'Matchday 1', base_price: 18 },
      { home_team: 'Balkan', away_team: 'Prishtina', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-08-30', match_time: '18:00', competition: 'Football Superleague of Kosova', round: 'Matchday 2', base_price: 15 }
    ];

    for (const match of matches) {
      const stadiumId = stadiumMap[match.stadium_name];
      if (!stadiumId) continue;

      const [existingMatch] = await queryInterface.sequelize.query(
        `SELECT id FROM matches WHERE home_team = '${match.home_team.replace(/'/g, "\\'")}' AND away_team = '${match.away_team.replace(/'/g, "\\'")}' AND match_date = '${match.match_date}' AND match_time = '${match.match_time}' LIMIT 1`
      );
      if (existingMatch.length === 0) {
        await queryInterface.bulkInsert('matches', [{
          home_team: match.home_team,
          away_team: match.away_team,
          stadium_id: stadiumId,
          match_date: match.match_date,
          match_time: match.match_time,
          competition: match.competition,
          round: match.round,
          base_price: match.base_price,
          status: 'scheduled',
          home_score: 0,
          away_score: 0,
          max_tickets_per_user: 4,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: new Date(),
          updated_at: new Date()
        }], {});
      }
    }

    // Create system settings (skip if already exist by unique key)
    const settingsData = [
      { key: 'site_name', value: 'Stadium Tickets', description: 'Website name', type: 'string' },
      { key: 'currency', value: 'EUR', description: 'Default currency', type: 'string' },
      { key: 'tax_rate', value: '20', description: 'Default tax rate (%)', type: 'number' },
      { key: 'ticket_booking_fee', value: '2.50', description: 'Booking fee per ticket', type: 'number' },
      { key: 'max_tickets_per_order', value: '10', description: 'Maximum tickets per order', type: 'number' }
    ];

    for (const setting of settingsData) {
      const [existingSetting] = await queryInterface.sequelize.query(
        `SELECT id FROM settings WHERE \`key\` = '${setting.key}' LIMIT 1`
      );
      if (existingSetting.length === 0) {
        await queryInterface.bulkInsert('settings', [{
          ...setting,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: new Date(),
          updated_at: new Date()
        }], {});
      }
    }

    console.log('✅ Seed data created successfully');
    console.log('📧 Admin user: admin@stadium.com / admin123');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('settings', null, {});
    await queryInterface.bulkDelete('matches', null, {});
    await queryInterface.bulkDelete('stadiums', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};