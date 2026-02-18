/**
 * Audit trail for all basket and order events.
 */
import mongoose from 'mongoose';

const auditEventTypes = [
  'SCAN',
  'ADD_ITEM',
  'REMOVE_ITEM',
  'CHECKOUT',
  'QR_GENERATED',
  'QR_VERIFIED',
  'WEIGHT_VERIFIED',
  'MANUAL_CHECK',
];

const auditLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, enum: auditEventTypes, index: true },
    sessionId: { type: String, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    payload: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ event: 1, createdAt: -1 });
auditLogSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
export { auditEventTypes };
