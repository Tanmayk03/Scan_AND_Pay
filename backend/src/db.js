/**
 * MongoDB connection using Mongoose.
 */
import mongoose from 'mongoose';
import { config } from './config/index.js';

export async function connectDB() {
  await mongoose.connect(config.mongodbUri);
  console.log('MongoDB connected');
}
