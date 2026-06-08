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

export async function getMlInsights() {
  const Order = (await import('../models/Order.js')).default;
  const VerificationLog = (await import('../models/VerificationLog.js')).default;

  const orders = await Order.find({}).lean();
  
  // 1. Transaction values buckets
  const valueBuckets = {
    under50: 0,
    from50to100: 0,
    from100to250: 0,
    from250to500: 0,
    over500: 0,
  };
  
  // 2. Risk score distribution
  const riskDistribution = {
    low: 0, // < 35
    medium: 0, // 35 - 70
    high: 0, // >= 70
  };

  let totalScanSeconds = 0;
  let totalScanItemCount = 0;
  let ordersWithScanDuration = 0;

  for (const o of orders) {
    const val = o.totalPrice || 0;
    if (val <= 50) valueBuckets.under50++;
    else if (val <= 100) valueBuckets.from50to100++;
    else if (val <= 250) valueBuckets.from100to250++;
    else if (val <= 500) valueBuckets.from250to500++;
    else valueBuckets.over500++;

    const risk = o.riskScore || 0;
    if (risk < 35) riskDistribution.low++;
    else if (risk < 70) riskDistribution.medium++;
    else riskDistribution.high++;

    if (o.scanDurationSeconds != null) {
      totalScanSeconds += o.scanDurationSeconds;
      const qty = o.items ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
      totalScanItemCount += qty;
      ordersWithScanDuration++;
    }
  }

  // 3. Weight match / mismatch counts
  const weightMatches = await VerificationLog.countDocuments({ type: 'weight', match: true });
  const weightMismatches = await VerificationLog.countDocuments({ type: 'weight', match: false });

  const avgScanDuration = ordersWithScanDuration > 0 ? (totalScanSeconds / ordersWithScanDuration) : 0;
  const avgScanSpeed = totalScanItemCount > 0 ? (totalScanSeconds / totalScanItemCount) : 0;

  return {
    valueBuckets,
    riskDistribution,
    weightVerification: {
      matches: weightMatches,
      mismatches: weightMismatches,
      total: weightMatches + weightMismatches,
    },
    scanSpeed: {
      avgDuration: Math.round(avgScanDuration * 10) / 10,
      avgSpeed: Math.round(avgScanSpeed * 10) / 10,
      totalTrackedOrders: ordersWithScanDuration,
    },
    totalOrders: orders.length,
  };
}
