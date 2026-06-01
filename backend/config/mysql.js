const { Sequelize } = require('sequelize');

// MySQL connection configuration
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'stadium_tickets',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');
    
    // Import models and define associations
    const { defineAssociations } = require('../src/models/mysql');
    defineAssociations();
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ MySQL models synchronized');
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    return false;
  }
};

const initializeMySQL = async () => {
  try {
    const connected = await connectMySQL();
    if (!connected) {
      throw new Error('Failed to connect to MySQL');
    }
    
    // Import models for seeding
    const { User, Role, Permission, Stadium, Match } = require('../src/models/mysql');
    const bcrypt = require('bcryptjs');
    
    // Check if data already exists
    const roleCount = await Role.count();
    const matchCount = await Match.count();
    
    if (roleCount > 0 && matchCount > 0) {
      console.log('✅ Seed data already exists (skipping)');
      return true;
    }

    console.log('🌱 Seeding initial data...');

    // Create admin user using raw SQL to avoid field mapping issues
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const [results] = await sequelize.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: ['System', 'Admin', 'admin@stadium.com', adminPassword, true],
      type: Sequelize.QueryTypes.INSERT
    });
    
    const adminUserId = results;

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

    const createdRoles = await Role.bulkCreate(roles);
    const roleIdMap = {};
    createdRoles.forEach(role => {
      roleIdMap[role.name] = role.id;
    });

    // Assign admin role to admin user
    await sequelize.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (?, ?, ?)
    `, {
      replacements: [adminUserId, roleIdMap.admin, adminUserId]
    });

    // Create permissions
    const permissions = [
      { name: 'users.view', resource: 'users', action: 'view' },
      { name: 'users.create', resource: 'users', action: 'create' },
      { name: 'users.edit', resource: 'users', action: 'edit' },
      { name: 'users.delete', resource: 'users', action: 'delete' },
      { name: 'stadiums.view', resource: 'stadiums', action: 'view' },
      { name: 'stadiums.manage', resource: 'stadiums', action: 'manage' },
      { name: 'matches.view', resource: 'matches', action: 'view' },
      { name: 'matches.manage', resource: 'matches', action: 'manage' },
      { name: 'tickets.view', resource: 'tickets', action: 'view' },
      { name: 'tickets.purchase', resource: 'tickets', action: 'purchase' },
      { name: 'tickets.manage', resource: 'tickets', action: 'manage' },
      { name: 'orders.view', resource: 'orders', action: 'view' },
      { name: 'orders.manage', resource: 'orders', action: 'manage' },
      { name: 'reports.view', resource: 'reports', action: 'view' },
      { name: 'reports.generate', resource: 'reports', action: 'generate' },
      { name: 'settings.view', resource: 'settings', action: 'view' },
      { name: 'settings.edit', resource: 'settings', action: 'edit' },
      { name: 'audit_logs.view', resource: 'audit_logs', action: 'view' }
    ];

    const createdPermissions = await Permission.bulkCreate(permissions);
    const permissionIdMap = {};
    createdPermissions.forEach(perm => {
      permissionIdMap[perm.name] = perm.id;
    });

    // Assign all permissions to admin role
    const rolePermissions = Object.values(permissionIdMap).map(permId => [
      roleIdMap.admin,
      permId,
      adminUserId
    ]);

    await sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_by)
      VALUES ?
    `, {
      replacements: [rolePermissions]
    });

    // Create stadiums for Albania and Kosova
    const stadiums = [
      ['National Stadium (Air Albania Stadium)', 'Tirana', 'Albania', 22500, 'Rruga e Elbasanit', 'Home stadium of the Albania national team'],
      ['Fadil Vokrri Stadium', 'Prishtina', 'Kosova', 13500, 'Bulevardi Bill Clinton', 'Home stadium of the Kosova national team'],
      ['Loro Boriçi Stadium', 'Shkodër', 'Albania', 16000, 'Rruga Skenderbeu', 'Historic stadium in northern Albania'],
      ['Selman Stërmasi Stadium', 'Tirana', 'Albania', 9500, 'Rruga e Kavajës', 'Home of KF Tirana'],
      ['Partizani Stadium', 'Tirana', 'Albania', 8500, 'Parku i Liqenit', 'Home of FK Partizani'],
      ['Gjirokastër Stadium', 'Gjirokastër', 'Albania', 8000, 'Rruga Eqrem Çabej', 'Stadium in the historic city'],
      ['Korçë Stadium', 'Korçë', 'Albania', 12000, 'Bulevardi Fan Noli', 'Home of Skënderbeu'],
      ['Mitrovica Stadium', 'Mitrovica', 'Kosova', 8500, 'Rruga Adem Jashari', 'Stadium in northern Kosova'],
      ['Ferizaj Stadium', 'Ferizaj', 'Kosova', 6000, 'Bulevardi Dëshmorët e Kombit', 'Home of Ferizaj'],
      ['Peja Stadium', 'Peja', 'Kosova', 7000, 'Rruga UÇK', 'Stadium in western Kosova']
    ];

    await Stadium.bulkCreate(stadiums.map(stadium => ({
      name: stadium[0],
      city: stadium[1],
      country: stadium[2],
      capacity: stadium[3],
      address: stadium[4],
      description: stadium[5],
      createdBy: adminUserId,
      updatedBy: adminUserId
    })));

    // Create matches for 2026 (all dates after June 1, 2026 when seasons make sense)
    // Summer: International friendlies, Euro/World Cup qualifiers
    // Fall: UEFA Nations League, domestic seasons start
    const matches = [
      // Summer International Friendlies (June-July)
      ['Albania', 'Kosova', 1, '2026-06-12', '20:45', 'Friendly Match', 'International Friendly', 30],
      ['Kosova', 'Albania', 2, '2026-06-19', '20:45', 'Friendly Match', 'International Friendly', 25],
      ['Albania', 'Serbia', 1, '2026-06-26', '20:45', 'Friendly Match', 'International Friendly', 35],
      
      // Euro 2028 Qualifiers (start September - realistic)
      ['Albania', 'Greece', 1, '2026-09-04', '20:45', 'Euro 2028 Qualifiers', 'Matchday 1', 40],
      ['Kosova', 'Turkey', 2, '2026-09-05', '20:45', 'Euro 2028 Qualifiers', 'Matchday 1', 35],
      ['Albania', 'Montenegro', 1, '2026-09-07', '20:45', 'Euro 2028 Qualifiers', 'Matchday 2', 28],
      ['Kosova', 'North Macedonia', 2, '2026-09-08', '18:00', 'Euro 2028 Qualifiers', 'Matchday 2', 20],
      
      // UEFA Nations League (October-November)
      ['Albania', 'Czech Republic', 1, '2026-10-10', '20:45', 'UEFA Nations League', 'Group Stage', 35],
      ['Kosova', 'Bosnia', 2, '2026-10-11', '20:45', 'UEFA Nations League', 'Group Stage', 22],
      ['Albania', 'Iceland', 1, '2026-10-14', '20:45', 'UEFA Nations League', 'Group Stage', 28],
      ['Kosova', 'Slovenia', 2, '2026-10-15', '18:00', 'UEFA Nations League', 'Group Stage', 20],
      
      // Euro 2028 Qualifiers (November)
      ['Albania', 'Wales', 1, '2026-11-14', '20:45', 'Euro 2028 Qualifiers', 'Matchday 5', 45],
      ['Kosova', 'Sweden', 2, '2026-11-15', '20:45', 'Euro 2028 Qualifiers', 'Matchday 5', 38],

      // Domestic league pre-season (August-September) + regular season
      // Kategoria Superiore (Albanian league - starts late August)
      ['Tirana', 'Partizani', 4, '2026-08-22', '18:00', 'Kategoria Superiore', 'Matchday 1', 15],
      ['Skënderbeu', 'Tirana', 7, '2026-08-29', '19:30', 'Kategoria Superiore', 'Matchday 2', 12],
      ['Partizani', 'Vllaznia', 6, '2026-09-12', '18:00', 'Kategoria Superiore', 'Matchday 3', 10],
      ['Tirana', 'Skënderbeu', 4, '2026-09-19', '20:00', 'Kategoria Superiore', 'Matchday 4', 18],
      ['Vllaznia', 'Partizani', 4, '2026-09-26', '18:00', 'Kategoria Superiore', 'Matchday 5', 12],
      ['Tirana', 'Vllaznia', 4, '2026-10-17', '18:00', 'Kategoria Superiore', 'Matchday 6', 14],
      ['Partizani', 'Skënderbeu', 6, '2026-10-24', '19:30', 'Kategoria Superiore', 'Matchday 7', 11],
      
      // Football Superleague of Kosova (starts late August)
      ['Prishtina', 'Drita', 2, '2026-08-23', '20:00', 'Football Superleague of Kosova', 'Matchday 1', 18],
      ['Balkan', 'Prishtina', 2, '2026-08-30', '18:00', 'Football Superleague of Kosova', 'Matchday 2', 15],
      ['Drita', 'Gjilani', 2, '2026-09-13', '20:00', 'Football Superleague of Kosova', 'Matchday 3', 14],
      ['Prishtina', 'Balkan', 2, '2026-09-20', '18:00', 'Football Superleague of Kosova', 'Matchday 4', 20],
      ['Drita', 'Prishtina', 2, '2026-09-27', '20:00', 'Football Superleague of Kosova', 'Matchday 5', 18],
      ['Gjilani', 'Balkan', 2, '2026-10-18', '18:00', 'Football Superleague of Kosova', 'Matchday 6', 12],
      ['Prishtina', 'Gjilani', 2, '2026-10-25', '20:00', 'Football Superleague of Kosova', 'Matchday 7', 16],
      
      // U21 Championship
      ['Albania U21', 'Kosova U21', 3, '2026-09-11', '17:00', 'U21 Championship', 'Group Stage', 10],
      ['Kosova U21', 'Albania U21', 3, '2026-10-09', '17:00', 'U21 Championship', 'Group Stage', 10]
    ];

    await Match.bulkCreate(matches.map(match => ({
      homeTeam: match[0],
      awayTeam: match[1],
      stadiumId: match[2],
      matchDate: match[3],
      matchTime: match[4],
      competition: match[5],
      round: match[6],
      basePrice: match[7],
      status: 'scheduled',
      createdBy: adminUserId,
      updatedBy: adminUserId
    })));

    // Create system settings
    const settings = [
      { key: 'site_name', value: 'Stadium Tickets', description: 'Website name', type: 'string' },
      { key: 'currency', value: 'EUR', description: 'Default currency', type: 'string' },
      { key: 'tax_rate', value: '20', description: 'Default tax rate (%)', type: 'number' },
      { key: 'ticket_booking_fee', value: '2.50', description: 'Booking fee per ticket', type: 'number' },
      { key: 'max_tickets_per_order', value: '10', description: 'Maximum tickets per order', type: 'number' }
    ];

    await sequelize.query(`
      INSERT INTO settings (\`key\`, value, description, type, created_by, updated_by)
      VALUES ?
    `, {
      replacements: [settings.map(setting => [
        setting.key, setting.value, setting.description, setting.type, adminUserId, adminUserId
      ])]
    });

    console.log('✅ Initial seed data created');
    console.log('📧 Admin user: admin@stadium.com / admin123');
    return true;
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    return false;
  }
};

module.exports = { 
  sequelize, 
  connectMySQL,
  initializeMySQL
};
