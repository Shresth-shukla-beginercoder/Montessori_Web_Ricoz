import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo_admin:MongoDB@127.0.0.1:27017/project29?authSource=admin';

async function checkConnection() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

checkConnection();
