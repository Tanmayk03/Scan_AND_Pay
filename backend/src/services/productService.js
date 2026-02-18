/**
 * Product lookup by barcode.
 */
import Product from '../models/Product.js';

export async function getByBarcode(barcode) {
  const product = await Product.findOne({ barcode: String(barcode).trim(), active: true }).lean();
  return product || null;
}
