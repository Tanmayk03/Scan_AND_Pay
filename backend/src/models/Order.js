/**
 * Order model - locked after checkout, with QR token and verification state.
 */
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  barcode: String,
  name: String,
  price: { type: Number, required: true },
  weight: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: Number,
  weightTotal: Number,
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    items: [orderItemSchema],
    totalPrice: { type: Number, required: true, min: 0 },
    expectedWeightSum: { type: Number, required: true, min: 0 }, // grams
    qrToken: { type: String, unique: true, sparse: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['LOCKED', 'PAID', 'CANCELLED'], default: 'LOCKED', index: true },
    verified: { type: Boolean, default: false, index: true },
    verifiedAt: Date,
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    flagged: { type: Boolean, default: false, index: true },
    manualCheck: { type: Boolean, default: false },
    manualCheckedAt: Date,
    manualCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

orderSchema.index({ qrToken: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ flagged: 1 });

export default mongoose.model('Order', orderSchema);
