import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (uri: string) => {
  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error({ err: error }, 'Database connection error');
    process.exit(1);
  }
};
