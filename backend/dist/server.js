"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./utils/logger"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const env_1 = require("./config/env");
dotenv_1.default.config();
async function startServer() {
    try {
        await (0, database_1.connectDB)(env_1.env.MONGO_URI);
        app_1.default.listen(env_1.env.PORT, () => {
            logger_1.default.info(`Server running on port ${env_1.env.PORT}`);
        });
    }
    catch (err) {
        logger_1.default.error({ err }, 'Failed to start server');
        process.exit(1);
    }
}
startServer();
