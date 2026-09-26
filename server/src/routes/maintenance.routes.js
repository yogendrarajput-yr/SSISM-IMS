import { Router } from 'express';
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  deleteMaintenanceLog,
} from '../controllers/maintenance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createMaintenanceSchema } from '../utils/validators.js';

/**
 * Maintenance & Upgrade Routes (/api/maintenance)
 * Logs hardware repairs, component replacements, and servicing costs.
 */
const router = Router();


router.use(authenticate);

router.get('/', getMaintenanceLogs);

// Staff and Super Admin can record hardware maintenance & upgrades and delete logs
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'STAFF'),
  validate(createMaintenanceSchema),
  createMaintenanceLog
);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), deleteMaintenanceLog);

export default router;
