import { Router } from 'express';
import { getFees, updateFee, checkStudentFee, deleteFee } from '../controllers/fee.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateFeeSchema } from '../utils/validators.js';

/**
 * License Fee Routes (/api/fees)
 * Tracks campus software license dues and enforces allocation clearance gates.
 */
const router = Router();


router.use(authenticate);

router.get('/', getFees);
router.get('/check/:studentId', checkStudentFee);

// Only Super Admin and Staff (Accounts/Inventory) can update and delete fee records
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), validate(updateFeeSchema), updateFee);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), deleteFee);

export default router;
