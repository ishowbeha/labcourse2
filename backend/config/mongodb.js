const mongoose = require('mongoose');
const SystemInfo = require('../models/SystemInfo');

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stadium_tickets';
    
    // Set a timeout for connection attempt
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 3 seconds')), 3000);
    });
    
    // Race between connection and timeout
    await Promise.race([
      mongoose.connect(mongoURI),
      timeoutPromise
    ]);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📁 Database: stadium_tickets`);

    // Seed the database with a startup document to make it visible in MongoDB Compass
    // MongoDB lazy-creates databases - they only appear when they have at least one document
    const existingInfo = await SystemInfo.findOne({ key: 'system_startup' });
    if (!existingInfo) {
      await SystemInfo.create({
        key: 'system_startup',
        value: {
          startedAt: new Date(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          database: 'stadium_tickets'
        }
      });
      console.log('✅ Database "stadium_tickets" initialized with seed data');
      console.log('📌 It should now be visible in MongoDB Compass');
    } else {
      await SystemInfo.updateOne(
        { key: 'system_startup' },
        { value: { ...existingInfo.value, lastRestart: new Date() }, updatedAt: new Date() }
      );
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't fail the server if MongoDB is not available
    console.log('⚠️  Continuing without MongoDB (some features may be limited)');
  }
};

module.exports = connectMongoDB;