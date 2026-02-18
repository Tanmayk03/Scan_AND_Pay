/**
 * Risk scoring: high order value, fast scan speed, weight mismatch, past history.
 * Score 0–100; above threshold flags for manual check.
 */
import { config } from '../config/index.js';
import Order from '../models/Order.js';

const RISK_THRESHOLD = config.risk.threshold;

/**
 * Compute risk score from order and context.
 * @param {Object} params - { orderValue, scanDurationSeconds, weightMismatch, orderId }
 * @returns { number } 0–100
 */
export async function calculateRiskScore({ orderValue = 0, scanDurationSeconds = null, weightMismatch = false, orderId = null }) {
  let score = 0;

  // High order value (e.g. > 100 EUR adds up to 25 points)
  if (orderValue > 200) score += 30;
  else if (orderValue > 100) score += 25;
  else if (orderValue > 50) score += 15;
  else if (orderValue > 20) score += 5;

  // Very fast scan (suspicious) – e.g. < 30s for whole basket
  if (scanDurationSeconds !== null && scanDurationSeconds < 20) score += 25;
  else if (scanDurationSeconds !== null && scanDurationSeconds < 45) score += 15;
  else if (scanDurationSeconds !== null && scanDurationSeconds < 60) score += 5;

  // Weight mismatch
  if (weightMismatch) score += 35;

  // Past history: previous orders from same session or high mismatch rate (simplified: just use order count if we had session history)
  if (orderId) {
    const sameSessionOrders = await Order.countDocuments({ orderId }).limit(1);
    // Could add more logic: e.g. count orders in last hour from same IP
  }

  return Math.min(100, Math.round(score));
}

/**
 * Check if order should be flagged for manual check.
 */
export function shouldFlagOrder(riskScore) {
  return riskScore >= RISK_THRESHOLD;
}

export { RISK_THRESHOLD };
