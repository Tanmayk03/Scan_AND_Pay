/**
 * Product model - barcode-indexed for fast lookup.
 */
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 }, // in grams
    unit: { type: String, default: 'pcs' },
    category: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ barcode: 1 });
productSchema.index({ active: 1 });

export default mongoose.model('Product', productSchema);
