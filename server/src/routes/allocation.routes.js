import { Router } from 'express';
import {
  getAllocations,
  createAllocation,
  returnAllocation,
  getReceipt,
  deleteAllocation,
} from '../controllers/allocation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAllocationSchema, returnAllocationSchema } from '../utils/validators.js';

/**
 * Allocation Routes (/api/allocations)
 * Manages laptop distribution lifecycle, zero-conflict locks, and return inspections.
 */
const router = Router();


router.use(authenticate);

router.get('/', getAllocations);
router.get('/:id/receipt', getReceipt);

// Staff & Super Admin can allocate, accept returns, and delete records
router.post('/', authorizeRoles('SUPER_ADMIN', 'STAFF'), validate(createAllocationSchema), createAllocation);
router.put('/:id/return', authorizeRoles('SUPER_ADMIN', 'STAFF'), validate(returnAllocationSchema), returnAllocation);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), deleteAllocation);

export default router;
