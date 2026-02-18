/**
 * Weight verification API: POST /api/verify-weight
 */
import * as verifyService from '../services/verifyService.js';

/** POST /api/verify-weight - Verify actual weight against order */
export async function verifyWeight(req, res, next) {
  try {
    const { token, actualWeight } = req.body;
    if (!token || actualWeight === undefined) {
      return res.status(400).json({ success: false, message: 'token and actualWeight required' });
    }
    const result = await verifyService.verifyWeight(token, actualWeight, req);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
