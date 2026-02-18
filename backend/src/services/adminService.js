/**
 * Admin: products CRUD, orders list, mismatches, flagged, config, random manual check.
 */
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import VerificationLog from '../models/VerificationLog.js';
import SystemConfig from '../models/SystemConfig.js';
import { logEvent } from './auditService.js';
import { config } from '../config/index.js';

const RANDOM_CHECK_PERCENT = config.risk.randomCheckPercent;

export async function listProducts(filters = {}) {
  const q = { active: filters.active !== false };
  if (filters.category) q.category = filters.category;
  return Product.find(q).sort({ name: 1 }).lean();
}

export async function getProduct(id) {
  return Product.findById(id).lean();
}

export async function createProduct(data) {
  return Product.create(data);
}

export async function updateProduct(id, data) {
  return Product.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
}

export async function deleteProduct(id) {
  return Product.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }).lean();
}

export async function listOrders(filters = {}) {
  const q = {};
  if (filters.status) q.status = filters.status;
  if (filters.flagged === true) q.flagged = true;
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(filters.limit || 100).lean();
  return orders;
}

export async function getOrder(id) {
  return Order.findById(id).populate('manualCheckedBy', 'email name').lean();
}

/** Weight mismatches: orders that have a weight verification log with match=false */
export async function listWeightMismatches(limit = 50) {
  const logs = await VerificationLog.find({ type: 'weight', match: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('orderId')
    .lean();
  return logs.filter((l) => l.orderId).map((l) => ({ log: l, order: l.orderId }));
}

/** Flagged orders */
export async function listFlaggedOrders(limit = 50) {
  return Order.find({ flagged: true }).sort({ createdAt: -1 }).limit(limit).lean();
}

/** Random X% of recent orders for manual check */
export async function getOrdersForRandomManualCheck(percent = RANDOM_CHECK_PERCENT, limit = 100) {
  const recent = await Order.find({ status: 'LOCKED', manualCheck: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const count = Math.max(1, Math.ceil((recent.length * percent) / 100));
  const shuffled = recent.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Mark order as manually checked */
export async function markManualCheck(orderId, userId, req) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { $set: { manualCheck: true, manualCheckedAt: new Date(), manualCheckedBy: userId } },
    { new: true }
  ).lean();
  if (order) {
    await logEvent('MANUAL_CHECK', { orderId: order._id, userId, payload: {} }, req);
  }
  return order;
}

/** Get system config by key */
export async function getSystemConfig(key) {
  const doc = await SystemConfig.findOne({ key }).lean();
  return doc?.value;
}

/** Set system config */
export async function setSystemConfig(key, value, userId) {
  return SystemConfig.findOneAndUpdate(
    { key },
    { $set: { value, updatedAt: new Date(), updatedBy: userId } },
    { upsert: true, new: true }
  ).lean();
}

/** Get weight tolerance and random check % from DB or env */
export async function getConfigForAdmin() {
  const weightToleranceGrams = await getSystemConfig('weightToleranceGrams') ?? config.weight.toleranceGrams;
  const weightTolerancePercent = await getSystemConfig('weightTolerancePercent') ?? config.weight.tolerancePercent;
  const randomCheckPercent = await getSystemConfig('randomCheckPercent') ?? config.risk.randomCheckPercent;
  const riskThreshold = await getSystemConfig('riskThreshold') ?? config.risk.threshold;
  return {
    weightToleranceGrams,
    weightTolerancePercent,
    randomCheckPercent,
    riskThreshold,
  };
}

export async function setConfigForAdmin(data, userId) {
  const updates = {};
  if (data.weightToleranceGrams != null) updates['weightToleranceGrams'] = data.weightToleranceGrams;
  if (data.weightTolerancePercent != null) updates['weightTolerancePercent'] = data.weightTolerancePercent;
  if (data.randomCheckPercent != null) updates['randomCheckPercent'] = data.randomCheckPercent;
  if (data.riskThreshold != null) updates['riskThreshold'] = data.riskThreshold;
  for (const [key, value] of Object.entries(updates)) {
    await setSystemConfig(key, value, userId);
  }
  return getConfigForAdmin();
}
