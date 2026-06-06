/**
 * Risk scoring: high order value, fast scan speed, weight mismatch, past history.
 * Model uses machine learning prediction via FastAPI, with a rule-based fallback.
 */
import { config } from '../config/index.js';
import Order from '../models/Order.js';

const RISK_THRESHOLD = config.risk.threshold;

/**
 * Helper to extract predictive features for the ML model.
 */
async function extractMlFeatures({ orderValue, items, orderId, scanDurationSeconds, weightMismatch }) {
  let checkoutItems = items;
  if (!checkoutItems && orderId) {
    const order = await Order.findById(orderId).lean();
    checkoutItems = order?.items;
  }
  
  checkoutItems = checkoutItems || [];
  
  // 1. itemCount
  const itemCount = checkoutItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  
  // 2. averageItemPrice
  const averageItemPrice = itemCount > 0 ? (orderValue / itemCount) : 0;
  
  // 3. scanDurationSeconds: default to 15s per item if null
  let scanSecs = scanDurationSeconds;
  if (scanSecs === null || scanSecs === undefined) {
    scanSecs = itemCount * 15; // default reasonable scan speed
  }
  
  // 4. weightMismatchRatio
  // Map weightMismatch boolean to a reasonable ratio (25% for true, 1% for false)
  const weightMismatchRatio = weightMismatch ? 0.25 : 0.01;
  
  // 5. hourOfDay
  const hourOfDay = new Date().getHours();
  
  // 6. categoryDiversity
  let categoryDiversity = 1;
  if (checkoutItems.length > 0) {
    const productIds = checkoutItems.map(item => item.productId).filter(Boolean);
    if (productIds.length > 0) {
      const Product = (await import('../models/Product.js')).default;
      const products = await Product.find({ _id: { $in: productIds } }).lean();
      const categories = products.map(p => p.category).filter(Boolean);
      categoryDiversity = new Set(categories).size || 1;
    }
  }
  
  return {
    order_value: Number(orderValue) || 0,
    item_count: Number(itemCount) || 1,
    average_item_price: Number(averageItemPrice) || 0,
    scan_duration_seconds: Number(scanSecs) || 15,
    weight_mismatch_ratio: Number(weightMismatchRatio) || 0.01,
    hour_of_day: Number(hourOfDay) || 12,
    category_diversity: Number(categoryDiversity) || 1
  };
}

/**
 * Call the FastAPI microservice to get prediction.
 */
async function callMlService(features) {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

    const response = await fetch(`${mlUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    
    const data = await response.json();
    return {
      riskScore: data.riskScore,
      flagged: data.flagged
    };
  } catch (err) {
    console.warn(`[ML Risk Guard] Service offline or errored: ${err.message}. Using fallback.`);
    return null;
  }
}

/**
 * Compute risk score from order and context.
 * @param {Object} params - { orderValue, scanDurationSeconds, weightMismatch, orderId, items }
 * @returns { Promise<number> } 0–100
 */
export async function calculateRiskScore({ orderValue = 0, scanDurationSeconds = null, weightMismatch = false, orderId = null, items = null }) {
  // Extract features
  const features = await extractMlFeatures({
    orderValue,
    items,
    orderId,
    scanDurationSeconds,
    weightMismatch
  });
  
  // Try calling the ML Service
  const mlResult = await callMlService(features);
  if (mlResult !== null) {
    return mlResult.riskScore;
  }
  
  // --- RULE-BASED FALLBACK ---
  let score = 0;

  // High order value
  if (orderValue > 200) score += 30;
  else if (orderValue > 100) score += 25;
  else if (orderValue > 50) score += 15;
  else if (orderValue > 20) score += 5;

  // Very fast scan
  if (scanDurationSeconds !== null && scanDurationSeconds < 20) score += 25;
  else if (scanDurationSeconds !== null && scanDurationSeconds < 45) score += 15;
  else if (scanDurationSeconds !== null && scanDurationSeconds < 60) score += 5;

  // Weight mismatch
  if (weightMismatch) score += 35;

  return Math.min(100, Math.round(score));
}

/**
 * Check if order should be flagged for manual check.
 */
export function shouldFlagOrder(riskScore) {
  return riskScore >= RISK_THRESHOLD;
}

export { RISK_THRESHOLD };

