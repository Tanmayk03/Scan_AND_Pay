/**
 * Product lookup by barcode.
 */
import Product from '../models/Product.js';

export async function getByBarcode(barcode) {
  const product = await Product.findOne({ barcode: String(barcode).trim(), active: true }).lean();
  return product || null;
}

export async function listPublic(query = {}) {
  const filter = { active: true };
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  return Product.find(filter).select('name barcode price weight category').limit(50).lean();
}
