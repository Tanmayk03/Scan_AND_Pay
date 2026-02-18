/**
 * Public QR verification: GET /verify/:token
 * Reject if expired or already verified; mark verified and log.
 */
import express from 'express';
import * as verifyService from '../services/verifyService.js';

const router = express.Router();

/** GET /verify/:token - Verify QR token (public) */
router.get('/:token', async (req, res, next) => {
  try {
    const result = await verifyService.verifyQrToken(req.params.token, req);
    if (!result.success) {
      const status = result.reason === 'not_found' ? 404 : result.reason === 'expired' ? 410 : 400;
      return res.status(status).json({ success: false, reason: result.reason });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
