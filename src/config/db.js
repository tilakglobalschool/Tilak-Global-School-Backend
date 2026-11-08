import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  // Guard: refuse to connect to localhost — Atlas only
  if (!uri) {
    throw new Error('❌ MONGO_URI is not set. Atlas connection string required.');
  }
  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    throw new Error(
      '❌ Localhost MongoDB is disabled. Please provide Atlas MONGO_URI in .env'
    );
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS:          45000,
    maxPoolSize:              10,
    bufferCommands:           true,
  });

  console.log('✅ Connected to MongoDB Atlas!');
  console.log('🌐 Host:    ', conn.connection.host);
  console.log('🗄️  Database:', conn.connection.name);

  mongoose.connection.on('disconnected', () =>
    console.warn('⚠️  MongoDB disconnected — Mongoose will auto-reconnect'));
  mongoose.connection.on('reconnected', () =>
    console.log('✅ MongoDB reconnected to Atlas'));
  mongoose.connection.on('error', (err) =>
    console.error('❌ MongoDB error:', err.message));
}
