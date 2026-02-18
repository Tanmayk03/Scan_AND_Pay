/**
 * API route aggregation.
 */
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

import * as productController from '../controllers/productController.js';
import * as basketController from '../controllers/basketController.js';
import * as sessionController from '../controllers/sessionController.js';
import * as orderController from '../controllers/orderController.js';
import * as verifyController from '../controllers/verifyController.js';
import * as authController from '../controllers/authController.js';
import * as adminController from '../controllers/adminController.js';
import * as networkController from '../controllers/networkController.js';

const router = express.Router();

// ----- Public -----
router.get('/network-url', networkController.getNetworkUrl);
router.get('/product/:barcode', productController.getByBarcode);
router.post('/basket/log', basketController.logAction);
router.post('/session/start', sessionController.start);
router.post('/orders', orderController.create);
router.post('/verify-weight', verifyController.verifyWeight);

// ----- Auth -----
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

// ----- Admin (admin + exitGuard for some) -----
router.get('/products', authenticate, authorize('admin', 'exitGuard'), productController.list);
router.get('/products/:id', authenticate, authorize('admin', 'exitGuard'), productController.getById);
router.post('/products', authenticate, authorize('admin'), productController.create);
router.put('/products/:id', authenticate, authorize('admin'), productController.update);
router.delete('/products/:id', authenticate, authorize('admin'), productController.remove);

router.get('/admin/orders', authenticate, authorize('admin', 'exitGuard'), adminController.listOrders);
router.get('/admin/orders/:id', authenticate, authorize('admin', 'exitGuard'), adminController.getOrder);
router.get('/admin/mismatches', authenticate, authorize('admin', 'exitGuard'), adminController.listMismatches);
router.get('/admin/flagged', authenticate, authorize('admin', 'exitGuard'), adminController.listFlagged);
router.get('/admin/random-check', authenticate, authorize('admin'), adminController.getRandomCheckCandidates);
router.post('/admin/orders/:id/manual-check', authenticate, authorize('admin', 'exitGuard'), adminController.markManualCheck);
router.get('/admin/config', authenticate, authorize('admin'), adminController.getConfig);
router.put('/admin/config', authenticate, authorize('admin'), adminController.setConfig);
router.get('/admin/audit', authenticate, authorize('admin'), adminController.listAuditLogs);

export default router;
