/**
 * Admin: orders, mismatches, flagged, config, random manual check.
 */
import * as adminService from '../services/adminService.js';

export async function listOrders(req, res, next) {
  try {
    const orders = await adminService.listOrders(req.query);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await adminService.getOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function listMismatches(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const data = await adminService.listWeightMismatches(limit);
    res.json({ success: true, mismatches: data });
  } catch (err) {
    next(err);
  }
}

export async function listFlagged(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const orders = await adminService.listFlaggedOrders(limit);
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

export async function getRandomCheckCandidates(req, res, next) {
  try {
    const percent = parseInt(req.query.percent || process.env.RANDOM_CHECK_PERCENT || '5', 10);
    const limit = parseInt(req.query.limit || '100', 10);
    const orders = await adminService.getOrdersForRandomManualCheck(percent, limit);
    res.json({ success: true, orders, count: orders.length });
  } catch (err) {
    next(err);
  }
}

export async function markManualCheck(req, res, next) {
  try {
    const order = await adminService.markManualCheck(req.params.id, req.user._id, req);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function getConfig(req, res, next) {
  try {
    const config = await adminService.getConfigForAdmin();
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

export async function setConfig(req, res, next) {
  try {
    const config = await adminService.setConfigForAdmin(req.body, req.user._id);
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const AuditLog = (await import('../models/AuditLog.js')).default;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const event = req.query.event;
    const sessionId = req.query.sessionId;
    const orderId = req.query.orderId;
    const q = {};
    if (event) q.event = event;
    if (sessionId) q.sessionId = sessionId;
    if (orderId) q.orderId = orderId;
    const logs = await AuditLog.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
}

export async function getMlStatus(req, res, next) {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    const statusUrl = `${mlUrl}/status`;
    const metricsUrl = `${mlUrl}/metrics`;
    
    let mlStatus = { status: 'offline', model_loaded: false, has_metrics: false };
    let mlMetrics = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const statusRes = await fetch(statusUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (statusRes.ok) {
        mlStatus = await statusRes.json();
        
        if (mlStatus.has_metrics) {
          const metricsController = new AbortController();
          const mTimeoutId = setTimeout(() => metricsController.abort(), 1000);
          const metricsRes = await fetch(metricsUrl, { signal: metricsController.signal });
          clearTimeout(mTimeoutId);
          if (metricsRes.ok) {
            mlMetrics = await metricsRes.json();
          }
        }
      }
    } catch (err) {
      // FastAPI is offline
    }
    
    res.json({
      success: true,
      status: mlStatus.status,
      modelLoaded: mlStatus.model_loaded,
      metrics: mlMetrics,
      fallbackActive: mlStatus.status === 'offline' || !mlStatus.model_loaded
    });
  } catch (err) {
    next(err);
  }
}

export async function getMlInsights(req, res, next) {
  try {
    const insights = await adminService.getMlInsights();
    res.json({ success: true, insights });
  } catch (err) {
    next(err);
  }
}

