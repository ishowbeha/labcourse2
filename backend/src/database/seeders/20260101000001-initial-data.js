'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const adminUser = await queryInterface.bulkInsert('users', [{
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

    const adminUserId = 1;

    // Create roles
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

    const createdRoles = await queryInterface.bulkInsert('roles', 
      roles.map(role => ({
        ...role,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );

    // Get admin role ID
    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
    );

    // Assign admin role to admin user
    await queryInterface.bulkInsert('user_roles', [{
      user_id: adminUserId,
      role_id: adminRole[0].id,
      assigned_by: adminUserId,
      assigned_at: new Date()
    }], {});

    // Create permissions
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

    const createdPermissions = await queryInterface.bulkInsert('permissions',
      permissions.map(perm => ({
        ...perm,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );

    // Get all permission IDs
    const [allPermissions] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions`
    );

    // Assign all permissions to admin role
    const rolePermissions = allPermissions.map(p => ({
      role_id: adminRole[0].id,
      permission_id: p.id,
      granted_by: adminUserId,
      granted_at: new Date()
    }));

    await queryInterface.bulkInsert('role_permissions', rolePermissions, {});

    // Create stadiums
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

    await queryInterface.bulkInsert('stadiums',
      stadiums.map(stadium => ({
        ...stadium,
        is_active: true,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );

    // Create matches
    const matches = [
      { home_team: 'Albania', away_team: 'Kosova', stadium_id: 1, match_date: '2026-06-12', match_time: '20:45', competition: 'Friendly Match', round: 'International Friendly', base_price: 30 },
      { home_team: 'Kosova', away_team: 'Albania', stadium_id: 2, match_date: '2026-06-19', match_time: '20:45', competition: 'Friendly Match', round: 'International Friendly', base_price: 25 },
      { home_team: 'Albania', away_team: 'Serbia', stadium_id: 1, match_date: '2026-06-26', match_time: '20:45', competition: 'Friendly Match', round: 'International Friendly', base_price: 35 },
      { home_team: 'Albania', away_team: 'Greece', stadium_id: 1, match_date: '2026-09-04', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 1', base_price: 40 },
      { home_team: 'Kosova', away_team: 'Turkey', stadium_id: 2, match_date: '2026-09-05', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 1', base_price: 35 },
      { home_team: 'Albania', away_team: 'Montenegro', stadium_id: 1, match_date: '2026-09-07', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 2', base_price: 28 },
      { home_team: 'Kosova', away_team: 'North Macedonia', stadium_id: 2, match_date: '2026-09-08', match_time: '18:00', competition: 'Euro 2028 Qualifiers', round: 'Matchday 2', base_price: 20 },
      { home_team: 'Albania', away_team: 'Czech Republic', stadium_id: 1, match_date: '2026-10-10', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 35 },
      { home_team: 'Kosova', away_team: 'Bosnia', stadium_id: 2, match_date: '2026-10-11', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 22 },
      { home_team: 'Albania', away_team: 'Iceland', stadium_id: 1, match_date: '2026-10-14', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 28 },
      { home_team: 'Kosova', away_team: 'Slovenia', stadium_id: 2, match_date: '2026-10-15', match_time: '18:00', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 20 },
      { home_team: 'Albania', away_team: 'Wales', stadium_id: 1, match_date: '2026-11-14', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 45 },
      { home_team: 'Kosova', away_team: 'Sweden', stadium_id: 2, match_date: '2026-11-15', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 38 },
      { home_team: 'Tirana', away_team: 'Partizani', stadium_id: 4, match_date: '2026-08-22', match_time: '18:00', competition: 'Kategoria Superiore', round: 'Matchday 1', base_price: 15 },
      { home_team: 'Skënderbeu', away_team: 'Tirana', stadium_id: 7, match_date: '2026-08-29', match_time: '19:30', competition: 'Kategoria Superiore', round: 'Matchday 2', base_price: 12 },
      { home_team: 'Prishtina', away_team: 'Drita', stadium_id: 2, match_date: '2026-08-23', match_time: '20:00', competition: 'Football Superleague of Kosova', round: 'Matchday 1', base_price: 18 },
      { home_team: 'Balkan', away_team: 'Prishtina', stadium_id: 2, match_date: '2026-08-30', match_time: '18:00', competition: 'Football Superleague of Kosova', round: 'Matchday 2', base_price: 15 },
      { home_team: 'Albania U21', away_team: 'Kosova U21', stadium_id: 3, match_date: '2026-09-11', match_time: '17:00', competition: 'U21 Championship', round: 'Group Stage', base_price: 10 },
      { home_team: 'Kosova U21', away_team: 'Albania U21', stadium_id: 3, match_date: '2026-10-09', match_time: '17:00', competition: 'U21 Championship', round: 'Group Stage', base_price: 10 }
    ];

    await queryInterface.bulkInsert('matches',
      matches.map(match => ({
        ...match,
        status: 'scheduled',
        home_score: 0,
        away_score: 0,
        max_tickets_per_user: 4,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );

    // Create system settings
    const settings = [
      { key: 'site_name', value: 'Stadium Tickets', description: 'Website name', type: 'string' },
      { key: 'currency', value: 'EUR', description: 'Default currency', type: 'string' },
      { key: 'tax_rate', value: '20', description: 'Default tax rate (%)', type: 'number' },
      { key: 'ticket_booking_fee', value: '2.50', description: 'Booking fee per ticket', type: 'number' },
      { key: 'max_tickets_per_order', value: '10', description: 'Maximum tickets per order', type: 'number' }
    ];

    await queryInterface.bulkInsert('settings',
      settings.map(setting => ({
        ...setting,
        created_by: adminUserId,
        updated_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      })),
      {}
    );

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