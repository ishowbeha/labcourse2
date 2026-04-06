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
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ MySQL models synchronized');
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    // Don't fail the server if MySQL is not available
    console.log('⚠️  Continuing without MySQL (using SQLite fallback)');
  }
};

module.exports = { sequelize, connectMySQL };