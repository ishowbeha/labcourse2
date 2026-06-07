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
    // Includes all 16 FIFA World Cup 2026 host stadiums + Albanian/Kosovan league stadiums
    const stadiums = [
      // ===== FIFA WORLD CUP 2026 — UNITED STATES (11 stadiums) =====
      { name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA', capacity: 71000, address: '1 AMB Dr NW, Atlanta, GA 30313', description: 'State-of-the-art retractable roof stadium hosting World Cup 2026 matches in Atlanta.' },
      { name: 'Gillette Stadium', city: 'Foxborough', country: 'USA', capacity: 65878, address: '1 Patriot Pl, Foxborough, MA 02035', description: 'Home of the New England Patriots hosting World Cup 2026 matches in the Boston area.' },
      { name: 'AT&T Stadium', city: 'Arlington', country: 'USA', capacity: 80000, address: '1 AT&T Way, Arlington, TX 76011', description: 'Massive domed stadium hosting World Cup 2026 matches in the Dallas area.' },
      { name: 'NRG Stadium', city: 'Houston', country: 'USA', capacity: 72220, address: '1 NRG Park, Houston, TX 77054', description: 'Iconic domed stadium hosting World Cup 2026 matches in Houston.' },
      { name: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA', capacity: 76416, address: '1 Arrowhead Dr, Kansas City, MO 64129', description: 'One of the loudest stadiums in the world, hosting World Cup 2026 in Kansas City.' },
      { name: 'SoFi Stadium', city: 'Inglewood', country: 'USA', capacity: 70240, address: '1001 S Stadium Dr, Inglewood, CA 90301', description: 'State-of-the-art stadium hosting World Cup 2026 matches in Los Angeles.' },
      { name: 'Hard Rock Stadium', city: 'Miami Gardens', country: 'USA', capacity: 65326, address: '347 Don Shula Dr, Miami Gardens, FL 33056', description: 'Premier South Florida stadium hosting World Cup 2026 matches in Miami.' },
      { name: 'MetLife Stadium', city: 'East Rutherford', country: 'USA', capacity: 82500, address: '1 MetLife Stadium Dr, East Rutherford, NJ 07073', description: 'Iconic stadium hosting World Cup 2026 matches in the New York/New Jersey area.' },
      { name: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA', capacity: 69596, address: '1 Lincoln Financial Field Way, Philadelphia, PA 19148', description: 'Historic Philadelphia stadium hosting World Cup 2026 matches.' },
      { name: "Levi's Stadium", city: 'Santa Clara', country: 'USA', capacity: 68500, address: '4900 Marie P DeBartolo Way, Santa Clara, CA 95054', description: 'Modern Silicon Valley stadium hosting World Cup 2026 in the San Francisco Bay Area.' },
      { name: 'Lumen Field', city: 'Seattle', country: 'USA', capacity: 68740, address: '800 Occidental Ave S, Seattle, WA 98134', description: 'Iconic open-air stadium hosting World Cup 2026 matches in Seattle.' },

      // ===== FIFA WORLD CUP 2026 — MEXICO (3 stadiums) =====
      { name: 'Estadio Akron', city: 'Zapopan', country: 'Mexico', capacity: 49325, address: 'Av. Circuito JVC, Zapopan, Jal.', description: 'Modern stadium hosting World Cup 2026 matches in Guadalajara. Home of Chivas.' },
      { name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', capacity: 87523, address: 'Calz. de Tlalpan 3465, Ciudad de México', description: 'Legendary stadium hosting its third World Cup. The most iconic stadium in Mexico.' },
      { name: 'Estadio BBVA', city: 'Guadalupe', country: 'Mexico', capacity: 53500, address: 'Av. Pablo Livas 201, Guadalupe, N.L.', description: 'State-of-the-art stadium hosting World Cup 2026 matches in Monterrey.' },

      // ===== FIFA WORLD CUP 2026 — CANADA (2 stadiums) =====
      { name: 'BC Place Stadium', city: 'Vancouver', country: 'Canada', capacity: 54500, address: '777 Pacific Blvd, Vancouver, BC V6B 4Y8', description: 'Canada\'s premier stadium hosting World Cup 2026 matches in Vancouver.' },
      { name: 'BMO Field', city: 'Toronto', country: 'Canada', capacity: 30000, address: '170 Princes\' Blvd, Toronto, ON M6K 3C3', description: 'Major Canadian stadium hosting World Cup 2026 matches in Toronto.' },

      // ===== Albania National Stadiums =====
      { name: 'National Stadium (Air Albania Stadium)', city: 'Tirana', country: 'Albania', capacity: 22500, address: 'Rruga e Elbasanit', description: 'The national stadium of Albania, home to the Albania national football team.' },
      { name: 'Loro Boriçi Stadium', city: 'Shkodër', country: 'Albania', capacity: 16000, address: 'Rruga Skenderbeu', description: 'Historic stadium in northern Albania, home to KF Vllaznia.' },
      { name: 'Selman Stërmasi Stadium', city: 'Tirana', country: 'Albania', capacity: 9500, address: 'Rruga e Kavajës', description: 'Historic stadium, home to KF Tirana.' },
      { name: 'Partizani Stadium', city: 'Tirana', country: 'Albania', capacity: 8500, address: 'Parku i Liqenit', description: 'Home stadium of FK Partizani Tirana.' },
      { name: 'Skënderbeu Stadium', city: 'Korçë', country: 'Albania', capacity: 12000, address: 'Bulevardi Fan Noli', description: 'Home stadium of KF Skënderbeu Korçë.' },
      { name: 'Gjirokastër Stadium', city: 'Gjirokastër', country: 'Albania', capacity: 8000, address: 'Rruga Eqrem Çabej', description: 'Stadium in the historic city of Gjirokastër.' },

      // ===== Kosova Stadiums =====
      { name: 'Fadil Vokrri Stadium', city: 'Prishtina', country: 'Kosova', capacity: 13500, address: 'Bulevardi Bill Clinton', description: 'Home stadium of the Kosova national team and FC Prishtina.' },
      { name: 'Mitrovica Stadium', city: 'Mitrovica', country: 'Kosova', capacity: 8500, address: 'Rruga Adem Jashari', description: 'Stadium in northern Kosova, home to KF Trepça.' },
      { name: 'Ferizaj Stadium', city: 'Ferizaj', country: 'Kosova', capacity: 6000, address: 'Bulevardi Dëshmorët e Kombit', description: 'Home of KF Ferizaj.' },
      { name: 'Peja Stadium', city: 'Peja', country: 'Kosova', capacity: 7000, address: 'Rruga UÇK', description: 'Stadium in western Kosova, home of KF Besa Pejë.' }
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

    // Create sections for each stadium (skip if already exist)
    const sectionConfigs = [
      // ===== World Cup 2026 — USA =====
      {
        stadiumName: 'Mercedes-Benz Stadium',
        sections: [
          { name: 'VIP Suite', row_count: 20, seats_per_row: 90, price_multiplier: 4.5 },
          { name: 'Club Level', row_count: 40, seats_per_row: 200, price_multiplier: 3.0 },
          { name: 'Lower Bowl', row_count: 50, seats_per_row: 560, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 55, seats_per_row: 604, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Gillette Stadium',
        sections: [
          { name: 'VIP Lounge', row_count: 15, seats_per_row: 80, price_multiplier: 4.0 },
          { name: 'Club Seats', row_count: 30, seats_per_row: 200, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 45, seats_per_row: 578, price_multiplier: 1.8 },
          { name: 'Upper Bowl', row_count: 50, seats_per_row: 654, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'AT&T Stadium',
        sections: [
          { name: 'Founders Club', row_count: 22, seats_per_row: 48, price_multiplier: 4.0 },
          { name: 'Lower Level', row_count: 38, seats_per_row: 550, price_multiplier: 2.5 },
          { name: 'Mezzanine', row_count: 28, seats_per_row: 500, price_multiplier: 1.8 },
          { name: 'Upper Level', row_count: 52, seats_per_row: 600, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'NRG Stadium',
        sections: [
          { name: 'VIP Suite', row_count: 18, seats_per_row: 89, price_multiplier: 4.0 },
          { name: 'Club Level', row_count: 35, seats_per_row: 214, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 45, seats_per_row: 622, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 52, seats_per_row: 676, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Arrowhead Stadium',
        sections: [
          { name: 'VIP Suite', row_count: 16, seats_per_row: 88, price_multiplier: 4.0 },
          { name: 'Club Level', row_count: 33, seats_per_row: 212, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 48, seats_per_row: 625, price_multiplier: 1.8 },
          { name: 'Upper Bowl', row_count: 55, seats_per_row: 691, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'SoFi Stadium',
        sections: [
          { name: 'VIP Lounge', row_count: 18, seats_per_row: 45, price_multiplier: 4.5 },
          { name: 'Platinum Level', row_count: 25, seats_per_row: 500, price_multiplier: 3.0 },
          { name: 'Gold Level', row_count: 35, seats_per_row: 550, price_multiplier: 2.0 },
          { name: 'Silver Level', row_count: 45, seats_per_row: 400, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Hard Rock Stadium',
        sections: [
          { name: 'VIP Suite', row_count: 17, seats_per_row: 88, price_multiplier: 4.0 },
          { name: 'Club Level', row_count: 32, seats_per_row: 219, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 44, seats_per_row: 568, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 50, seats_per_row: 637, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'MetLife Stadium',
        sections: [
          { name: 'VIP Suite', row_count: 20, seats_per_row: 50, price_multiplier: 4.0 },
          { name: 'Lower Bowl', row_count: 40, seats_per_row: 600, price_multiplier: 2.5 },
          { name: 'Club Level', row_count: 30, seats_per_row: 500, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 50, seats_per_row: 700, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Lincoln Financial Field',
        sections: [
          { name: 'VIP Suite', row_count: 16, seats_per_row: 75, price_multiplier: 4.0 },
          { name: 'Club Level', row_count: 30, seats_per_row: 217, price_multiplier: 2.5 },
          { name: 'Lower Bowl', row_count: 42, seats_per_row: 643, price_multiplier: 1.8 },
          { name: 'Upper Bowl', row_count: 48, seats_per_row: 727, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: "Levi's Stadium",
        sections: [
          { name: 'VIP Suite', row_count: 16, seats_per_row: 81, price_multiplier: 4.2 },
          { name: 'Club Level', row_count: 35, seats_per_row: 229, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 44, seats_per_row: 591, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 50, seats_per_row: 664, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Lumen Field',
        sections: [
          { name: 'VIP Suite', row_count: 15, seats_per_row: 73, price_multiplier: 4.0 },
          { name: 'Club Level', row_count: 32, seats_per_row: 219, price_multiplier: 2.8 },
          { name: 'Lower Bowl', row_count: 45, seats_per_row: 622, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 48, seats_per_row: 680, price_multiplier: 1.0 }
        ]
      },

      // ===== World Cup 2026 — Mexico =====
      {
        stadiumName: 'Estadio Akron',
        sections: [
          { name: 'VIP Palco', row_count: 12, seats_per_row: 67, price_multiplier: 3.5 },
          { name: 'Platea', row_count: 30, seats_per_row: 400, price_multiplier: 2.0 },
          { name: 'Preferente', row_count: 35, seats_per_row: 514, price_multiplier: 1.5 },
          { name: 'General', row_count: 40, seats_per_row: 463, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Estadio Azteca',
        sections: [
          { name: 'VIP Palco', row_count: 15, seats_per_row: 40, price_multiplier: 3.5 },
          { name: 'Platea', row_count: 35, seats_per_row: 550, price_multiplier: 2.0 },
          { name: 'Preferente', row_count: 40, seats_per_row: 600, price_multiplier: 1.5 },
          { name: 'General', row_count: 60, seats_per_row: 500, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Estadio BBVA',
        sections: [
          { name: 'VIP Suite', row_count: 12, seats_per_row: 75, price_multiplier: 3.5 },
          { name: 'Platea', row_count: 28, seats_per_row: 464, price_multiplier: 2.0 },
          { name: 'Preferente', row_count: 35, seats_per_row: 571, price_multiplier: 1.5 },
          { name: 'General', row_count: 38, seats_per_row: 516, price_multiplier: 1.0 }
        ]
      },

      // ===== World Cup 2026 — Canada =====
      {
        stadiumName: 'BC Place Stadium',
        sections: [
          { name: 'VIP Skybox', row_count: 12, seats_per_row: 30, price_multiplier: 3.5 },
          { name: 'Lower Bowl', row_count: 30, seats_per_row: 450, price_multiplier: 2.0 },
          { name: 'Upper Bowl', row_count: 40, seats_per_row: 500, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'BMO Field',
        sections: [
          { name: 'VIP', row_count: 10, seats_per_row: 25, price_multiplier: 3.0 },
          { name: 'Main Stand', row_count: 25, seats_per_row: 400, price_multiplier: 1.8 },
          { name: 'General Admission', row_count: 30, seats_per_row: 450, price_multiplier: 1.0 }
        ]
      },

      // ===== Albanian Stadiums =====
      {
        stadiumName: 'National Stadium (Air Albania Stadium)',
        sections: [
          { name: 'VIP North', row_count: 25, seats_per_row: 100, price_multiplier: 3.0 },
          { name: 'East Stand', row_count: 35, seats_per_row: 200, price_multiplier: 1.5 },
          { name: 'West Stand', row_count: 35, seats_per_row: 200, price_multiplier: 1.5 },
          { name: 'South Stand', row_count: 30, seats_per_row: 200, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Loro Boriçi Stadium',
        sections: [
          { name: 'VIP', row_count: 15, seats_per_row: 40, price_multiplier: 2.5 },
          { name: 'Main Stand', row_count: 30, seats_per_row: 150, price_multiplier: 1.3 },
          { name: 'East Side', row_count: 25, seats_per_row: 160, price_multiplier: 1.0 },
          { name: 'North Side', row_count: 20, seats_per_row: 150, price_multiplier: 0.8 }
        ]
      },
      {
        stadiumName: 'Selman Stërmasi Stadium',
        sections: [
          { name: 'VIP', row_count: 10, seats_per_row: 40, price_multiplier: 2.0 },
          { name: 'Main Stand', row_count: 30, seats_per_row: 137, price_multiplier: 1.3 },
          { name: 'Away Stand', row_count: 25, seats_per_row: 200, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Partizani Stadium',
        sections: [
          { name: 'VIP', row_count: 8, seats_per_row: 62, price_multiplier: 2.5 },
          { name: 'North', row_count: 20, seats_per_row: 150, price_multiplier: 1.2 },
          { name: 'South', row_count: 25, seats_per_row: 200, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Skënderbeu Stadium',
        sections: [
          { name: 'VIP', row_count: 12, seats_per_row: 50, price_multiplier: 2.0 },
          { name: 'East', row_count: 25, seats_per_row: 168, price_multiplier: 1.2 },
          { name: 'West', row_count: 30, seats_per_row: 240, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Gjirokastër Stadium',
        sections: [
          { name: 'VIP', row_count: 8, seats_per_row: 30, price_multiplier: 2.0 },
          { name: 'Main Stand', row_count: 20, seats_per_row: 120, price_multiplier: 1.2 },
          { name: 'Open Stand', row_count: 30, seats_per_row: 150, price_multiplier: 1.0 }
        ]
      },

      // ===== Kosova Stadiums =====
      {
        stadiumName: 'Fadil Vokrri Stadium',
        sections: [
          { name: 'VIP', row_count: 12, seats_per_row: 40, price_multiplier: 2.5 },
          { name: 'West Stand', row_count: 25, seats_per_row: 160, price_multiplier: 1.3 },
          { name: 'East Stand', row_count: 25, seats_per_row: 180, price_multiplier: 1.0 },
          { name: 'North Stand', row_count: 20, seats_per_row: 150, price_multiplier: 0.8 }
        ]
      },
      {
        stadiumName: 'Mitrovica Stadium',
        sections: [
          { name: 'Main Stand', row_count: 15, seats_per_row: 100, price_multiplier: 1.5 },
          { name: 'East Stand', row_count: 20, seats_per_row: 120, price_multiplier: 1.2 },
          { name: 'West Stand', row_count: 25, seats_per_row: 150, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Ferizaj Stadium',
        sections: [
          { name: 'Main Stand', row_count: 12, seats_per_row: 80, price_multiplier: 1.3 },
          { name: 'Open Stand', row_count: 20, seats_per_row: 125, price_multiplier: 1.0 }
        ]
      },
      {
        stadiumName: 'Peja Stadium',
        sections: [
          { name: 'Main Stand', row_count: 14, seats_per_row: 90, price_multiplier: 1.3 },
          { name: 'Open Stand', row_count: 22, seats_per_row: 140, price_multiplier: 1.0 }
        ]
      }
    ];

    for (const config of sectionConfigs) {
      const stadiumId = stadiumMap[config.stadiumName];
      if (!stadiumId) continue;

      for (const section of config.sections) {
        const [existingSection] = await queryInterface.sequelize.query(
          `SELECT id FROM sections WHERE stadium_id = ${stadiumId} AND name = '${section.name}' LIMIT 1`
        );
        if (existingSection.length === 0) {
          await queryInterface.bulkInsert('sections', [{
            stadium_id: stadiumId,
            name: section.name,
            row_count: section.row_count,
            seats_per_row: section.seats_per_row,
            price_multiplier: section.price_multiplier,
            created_by: adminUserId,
            updated_by: adminUserId,
            created_at: new Date(),
            updated_at: new Date()
          }], {});
        }
      }
    }

    // Create matches (skip if already exist)
    // FIFA World Cup 2026 matches at all 16 host stadiums — all closest to today (June 3, 2026)
    const matches = [
      // ===== FIFA World Cup 2026 Group Stage =====
      { home_team: 'Argentina', away_team: 'Nigeria', stadium_name: 'Mercedes-Benz Stadium', match_date: '2026-06-13', match_time: '18:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 85 },
      { home_team: 'Germany', away_team: 'Japan', stadium_name: 'Gillette Stadium', match_date: '2026-06-13', match_time: '21:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 80 },
      { home_team: 'Brazil', away_team: 'Serbia', stadium_name: 'AT&T Stadium', match_date: '2026-06-14', match_time: '18:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 90 },
      { home_team: 'France', away_team: 'Tunisia', stadium_name: 'NRG Stadium', match_date: '2026-06-14', match_time: '21:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 85 },
      { home_team: 'England', away_team: 'Iran', stadium_name: 'Arrowhead Stadium', match_date: '2026-06-15', match_time: '16:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 80 },
      { home_team: 'Spain', away_team: 'Costa Rica', stadium_name: 'SoFi Stadium', match_date: '2026-06-15', match_time: '19:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 85 },
      { home_team: 'Portugal', away_team: 'Ghana', stadium_name: 'Hard Rock Stadium', match_date: '2026-06-16', match_time: '17:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 80 },
      { home_team: 'Netherlands', away_team: 'Senegal', stadium_name: 'MetLife Stadium', match_date: '2026-06-16', match_time: '20:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 85 },
      { home_team: 'Belgium', away_team: 'Canada', stadium_name: 'Lincoln Financial Field', match_date: '2026-06-17', match_time: '18:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 80 },
      { home_team: 'Croatia', away_team: 'Morocco', stadium_name: "Levi's Stadium", match_date: '2026-06-17', match_time: '21:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 75 },
      { home_team: 'Uruguay', away_team: 'South Korea', stadium_name: 'Lumen Field', match_date: '2026-06-18', match_time: '16:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 75 },
      { home_team: 'Mexico', away_team: 'Saudi Arabia', stadium_name: 'Estadio Akron', match_date: '2026-06-18', match_time: '20:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 70 },
      { home_team: 'USA', away_team: 'Ecuador', stadium_name: 'Estadio Azteca', match_date: '2026-06-19', match_time: '18:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 95 },
      { home_team: 'Italy', away_team: 'Australia', stadium_name: 'Estadio BBVA', match_date: '2026-06-19', match_time: '21:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 70 },
      { home_team: 'Denmark', away_team: 'Cameroon', stadium_name: 'BC Place Stadium', match_date: '2026-06-20', match_time: '16:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 65 },
      { home_team: 'Switzerland', away_team: 'Qatar', stadium_name: 'BMO Field', match_date: '2026-06-20', match_time: '20:00', competition: 'FIFA World Cup 2026', round: 'Group Stage', base_price: 60 },

      // ===== UEFA Nations League & Euro Qualifiers (at Albanian/Kosovan stadiums) =====
      { home_team: 'Albania', away_team: 'Czech Republic', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-10-10', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 35 },
      { home_team: 'Kosova', away_team: 'Bosnia', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-10-11', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 22 },
      { home_team: 'Albania', away_team: 'Iceland', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-10-14', match_time: '20:45', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 28 },
      { home_team: 'Kosova', away_team: 'Slovenia', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-10-15', match_time: '18:00', competition: 'UEFA Nations League', round: 'Group Stage', base_price: 20 },
      { home_team: 'Albania', away_team: 'Wales', stadium_name: 'National Stadium (Air Albania Stadium)', match_date: '2026-11-14', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 45 },
      { home_team: 'Kosova', away_team: 'Sweden', stadium_name: 'Fadil Vokrri Stadium', match_date: '2026-11-15', match_time: '20:45', competition: 'Euro 2028 Qualifiers', round: 'Matchday 5', base_price: 38 },

      // ===== Domestic Leagues (at local stadiums) =====
      { home_team: 'Tirana', away_team: 'Partizani', stadium_name: 'Selman Stërmasi Stadium', match_date: '2026-08-22', match_time: '18:00', competition: 'Kategoria Superiore', round: 'Matchday 1', base_price: 15 },
      { home_team: 'Skënderbeu', away_team: 'Tirana', stadium_name: 'Skënderbeu Stadium', match_date: '2026-08-29', match_time: '19:30', competition: 'Kategoria Superiore', round: 'Matchday 2', base_price: 12 },
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

    console.log('✅ Seed data created successfully');
    console.log('📧 Admin user: admin@stadium.com / admin123');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sections', null, {});
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('matches', null, {});
    await queryInterface.bulkDelete('stadiums', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};