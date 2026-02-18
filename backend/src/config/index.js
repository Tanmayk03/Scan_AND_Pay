/**
 * Central configuration from environment variables.
 */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/scanpay',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  qr: {
    expireMinutes: parseInt(process.env.QR_EXPIRE_MINUTES || '10', 10),
  },
  risk: {
    threshold: parseInt(process.env.RISK_THRESHOLD || '70', 10),
    randomCheckPercent: parseInt(process.env.RANDOM_CHECK_PERCENT || '5', 10),
  },
  weight: {
    toleranceGrams: parseInt(process.env.WEIGHT_TOLERANCE_GRAMS || '10', 10),
    tolerancePercent: parseInt(process.env.WEIGHT_TOLERANCE_PERCENT || '3', 10),
  },
};
