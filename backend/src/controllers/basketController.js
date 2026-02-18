/**
 * Basket actions: log ADD_ITEM / REMOVE_ITEM to backend for audit.
 */
import * as auditService from '../services/auditService.js';

/** POST /api/basket/log - Log basket action (add/remove) for audit */
export async function logAction(req, res, next) {
  try {
    const { event, sessionId, payload } = req.body;
    if (!['ADD_ITEM', 'REMOVE_ITEM'].includes(event)) {
      return res.status(400).json({ success: false, message: 'Invalid event' });
    }
    await auditService.logEvent(event, { sessionId, payload }, req);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
