/**
 * Product API: lookup by barcode (public) and CRUD (admin).
 */
import * as productService from '../services/productService.js';
import * as adminService from '../services/adminService.js';
import * as auditService from '../services/auditService.js';

/** GET /api/product/:barcode - Public product lookup by barcode */
export async function getByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    const product = await productService.getByBarcode(barcode);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products - Admin: list products */
export async function list(req, res, next) {
  try {
    const products = await adminService.listProducts(req.query);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products/:id - Admin: get one product */
export async function getById(req, res, next) {
  try {
    const product = await adminService.getProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

/** POST /api/products - Admin: create product */
export async function create(req, res, next) {
  try {
    const product = await adminService.createProduct(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/products/:id - Admin: update product */
export async function update(req, res, next) {
  try {
    const product = await adminService.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/products/:id - Admin: soft delete */
export async function remove(req, res, next) {
  try {
    const product = await adminService.deleteProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}
