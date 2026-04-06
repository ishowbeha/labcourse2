const mongoose = require('mongoose');

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
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't fail the server if MongoDB is not available
    console.log('⚠️  Continuing without MongoDB (some features may be limited)');
  }
};

module.exports = connectMongoDB;
