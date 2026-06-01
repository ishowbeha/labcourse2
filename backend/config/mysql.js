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
    
    console.log('✅ MySQL initialized successfully');
    console.log('💡 Run migrations with: npm run migrate');
    console.log('💡 Run seeders with:   npm run seed');
    return true;
  } catch (error) {
    console.error('❌ Error initializing MySQL:', error.message);
    return false;
  }
};

module.exports = { 
  sequelize, 
  connectMySQL,
  initializeMySQL
};
