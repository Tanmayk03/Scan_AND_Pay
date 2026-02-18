/**
 * Checkout session metadata (IP, device, timestamp).
 */
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    ip: String,
    userAgent: String,
    startedAt: { type: Date, default: Date.now },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ startedAt: -1 });

export default mongoose.model('Session', sessionSchema);
