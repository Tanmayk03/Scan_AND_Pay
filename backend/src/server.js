/**
 * Self-Checkout Scan & Pay - Backend entry point.
 */
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { config } from './config/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import verifyRoutes from './routes/verify.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api', apiRoutes);
// Public QR verification: GET /verify/:token
app.use('/verify', verifyRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
