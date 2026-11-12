import app from './app';
import logger from './utils/logger';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { env } from './config/env';

dotenv.config();

async function startServer() {
  try {
    await connectDB(env.MONGO_URI);

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
