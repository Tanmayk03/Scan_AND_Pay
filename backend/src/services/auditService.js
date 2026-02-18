/**
 * Audit trail service - log all events with session/order context.
 */
import AuditLog, { auditEventTypes } from '../models/AuditLog.js';

/**
 * Get client IP and user-agent from request.
 */
function getRequestMeta(req) {
  const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const userAgent = req.headers['user-agent'];
  return { ip, userAgent };
}

/**
 * Create an audit log entry. Does not throw; logs errors internally.
 */
export async function logEvent(event, data = {}, req = null) {
  if (!auditEventTypes.includes(event)) {
    console.warn(`Unknown audit event: ${event}`);
    return null;
  }
  const meta = req ? getRequestMeta(req) : {};
  try {
    const log = await AuditLog.create({
      event,
      sessionId: data.sessionId,
      orderId: data.orderId,
      userId: data.userId,
      payload: data.payload,
      ip: data.ip ?? meta.ip,
      userAgent: data.userAgent ?? meta.userAgent,
    });
    return log;
  } catch (err) {
    console.error('Audit log error:', err);
    return null;
  }
}

export { auditEventTypes };
