import { Router } from 'express';
import { getAuditLogs, deleteAuditLog, purgeAuditLogs } from '../controllers/audit.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';

/**
 * Audit Trail Routes (/api/audit-logs)
 * Provides immutable security and lifecycle operation logs for compliance.
 */
const router = Router();


router.use(authenticate);

// View audit trails
router.get('/', authorizeRoles('SUPER_ADMIN', 'HIGHER_MANAGEMENT'), getAuditLogs);

// Delete / Purge audit trails (Super Admin only)
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), deleteAuditLog);
router.post('/purge', authorizeRoles('SUPER_ADMIN'), purgeAuditLogs);

export default router;
