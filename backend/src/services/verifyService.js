/**
 * QR verification and weight verification.
 */
import Order from '../models/Order.js';
import VerificationLog from '../models/VerificationLog.js';
import { config } from '../config/index.js';
import { logEvent } from './auditService.js';
import { calculateRiskScore, shouldFlagOrder } from './riskService.js';

const TOLERANCE_GRAMS = config.weight.toleranceGrams;
const TOLERANCE_PERCENT = config.weight.tolerancePercent;

/**
 * Mark order as QR-verified if not expired and not already verified.
 */
export async function verifyQrToken(qrToken, req) {
  const order = await Order.findOne({ qrToken: String(qrToken).trim() });
  if (!order) {
    return { success: false, reason: 'not_found' };
  }
  if (order.verified) {
    return { success: false, reason: 'already_verified' };
  }
  if (new Date() > order.expiresAt) {
    return { success: false, reason: 'expired' };
  }

  order.verified = true;
  order.verifiedAt = new Date();
  await order.save();

  await VerificationLog.create({
    orderId: order._id,
    type: 'qr',
    ip: req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0],
    userAgent: req?.headers?.['user-agent'],
  });

  await logEvent('QR_VERIFIED', { orderId: order._id, payload: { qrToken } }, req);

  return {
    success: true,
    orderId: order._id,
    totalPrice: order.totalPrice,
    expectedWeightSum: order.expectedWeightSum,
  };
}

/**
 * Compute tolerance: max(10g, 3% of expectedWeightSum). Config overrides.
 */
export function getTolerance(expectedWeightSum) {
  const fromGrams = TOLERANCE_GRAMS;
  const fromPercent = (expectedWeightSum * TOLERANCE_PERCENT) / 100;
  return Math.max(fromGrams, fromPercent);
}

/**
 * Verify weight: compare actualWeight to expectedWeightSum within tolerance.
 */
export async function verifyWeight(qrToken, actualWeight, req) {
  const order = await Order.findOne({ qrToken: String(qrToken).trim() });
  if (!order) {
    return { success: false, match: false, reason: 'order_not_found' };
  }

  const expected = order.expectedWeightSum;
  const actual = Number(actualWeight);
  const tolerance = getTolerance(expected);
  const diff = Math.abs(actual - expected);
  const match = diff <= tolerance;

  await VerificationLog.create({
    orderId: order._id,
    type: 'weight',
    expectedWeight: expected,
    actualWeight: actual,
    tolerance,
    match,
    ip: req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0],
    userAgent: req?.headers?.['user-agent'],
  });

  await logEvent('WEIGHT_VERIFIED', {
    orderId: order._id,
    payload: { expected, actual, tolerance, match },
  }, req);

  // Update risk if mismatch and optionally re-flag
  if (!match) {
    const newRisk = await calculateRiskScore({
      orderValue: order.totalPrice,
      weightMismatch: true,
      orderId: order._id,
    });
    order.riskScore = Math.max(order.riskScore, newRisk);
    order.flagged = order.flagged || shouldFlagOrder(newRisk);
    await order.save();
  }

  return {
    success: true,
    match,
    expectedWeightSum: expected,
    actualWeight,
    tolerance,
    orderId: order._id,
  };
}
