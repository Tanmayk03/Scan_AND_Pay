/**
 * Weight verification and QR verification logs.
 */
import mongoose from 'mongoose';

const verificationLogSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    type: { type: String, enum: ['qr', 'weight'], required: true, index: true },
    expectedWeight: Number,
    actualWeight: Number,
    tolerance: Number,
    match: Boolean,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

verificationLogSchema.index({ orderId: 1, type: 1 });

export default mongoose.model('VerificationLog', verificationLogSchema);
