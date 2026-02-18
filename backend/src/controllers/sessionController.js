/**
 * Session: start checkout session, return sessionId.
 */
import * as orderService from '../services/orderService.js';

/** POST /api/session/start - Start checkout session, get sessionId */
export async function start(req, res, next) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
    const userAgent = req.headers['user-agent'] || '';
    const sessionId = await orderService.createSession({ ip, userAgent });
    res.json({ success: true, sessionId });
  } catch (err) {
    next(err);
  }
}
