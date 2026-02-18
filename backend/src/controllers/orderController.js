/**
 * Orders: create order (lock basket), compute total, QR token, etc.
 */
import * as orderService from '../services/orderService.js';

/** POST /api/orders - Lock basket, create order, return QR token and totals */
export async function create(req, res, next) {
  try {
    const { sessionId, items } = req.body;
    if (!sessionId || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'sessionId and items array required' });
    }
    const result = await orderService.createOrderFromBasket({ sessionId, items }, req);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
