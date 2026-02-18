/**
 * Order creation, locking basket, QR token, totals and risk.
 */
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import Order from '../models/Order.js';
import Session from '../models/Session.js';
import Product from '../models/Product.js';
import { logEvent } from './auditService.js';
import { calculateRiskScore, shouldFlagOrder } from './riskService.js';

const QR_EXPIRE_MS = config.qr.expireMinutes * 60 * 1000;

/**
 * Create session record and return sessionId.
 */
export async function createSession(meta) {
  const sessionId = uuidv4();
  await Session.create({
    sessionId,
    ip: meta?.ip ?? '',
    userAgent: meta?.userAgent ?? '',
  });
  return sessionId;
}

/**
 * Lock basket: create order with items, total, expected weight, QR token, expiresAt.
 * Log CHECKOUT, QR_GENERATED; compute risk and set flagged if needed.
 */
export async function createOrderFromBasket({ sessionId, items }, req) {
  if (!items || items.length === 0) {
    throw Object.assign(new Error('Basket is empty'), { statusCode: 400 });
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, active: true }).lean();
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems = [];
  let totalPrice = 0;
  let expectedWeightSum = 0;

  for (const line of items) {
    const product = productMap.get(line.productId);
    if (!product) continue;
    const qty = Math.max(1, line.quantity || 1);
    const subtotal = product.price * qty;
    const weightTotal = product.weight * qty;
    orderItems.push({
      productId: product._id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      weight: product.weight,
      quantity: qty,
      subtotal,
      weightTotal,
    });
    totalPrice += subtotal;
    expectedWeightSum += weightTotal;
  }

  if (orderItems.length === 0) {
    throw Object.assign(new Error('No valid products in basket'), { statusCode: 400 });
  }

  const expiresAt = new Date(Date.now() + QR_EXPIRE_MS);
  const qrToken = uuidv4();

  const scanDurationSeconds = null; // Frontend can send this in payload if tracked
  const riskScore = await calculateRiskScore({
    orderValue: totalPrice,
    scanDurationSeconds,
    weightMismatch: false,
  });
  const flagged = shouldFlagOrder(riskScore);

  const order = await Order.create({
    sessionId,
    items: orderItems,
    totalPrice,
    expectedWeightSum,
    qrToken,
    expiresAt,
    status: 'LOCKED',
    riskScore,
    flagged,
  });

  await logEvent('CHECKOUT', { sessionId, orderId: order._id, payload: { totalPrice, itemCount: orderItems.length } }, req);
  await logEvent('QR_GENERATED', { sessionId, orderId: order._id, payload: { qrToken, expiresAt } }, req);

  return {
    orderId: order._id,
    qrToken,
    expiresAt,
    totalPrice,
    expectedWeightSum,
    riskScore,
    flagged,
    items: order.items,
  };
}

/**
 * Get order by QR token (for verification).
 */
export async function getOrderByToken(qrToken) {
  const order = await Order.findOne({ qrToken: String(qrToken).trim() }).lean();
  return order || null;
}
