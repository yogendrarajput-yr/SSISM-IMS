import { Router } from 'express';
import {
  getDonors,
  getDonorById,
  getDonorAssets,
  createDonor,
  updateDonor,
  deleteDonor,
} from '../controllers/donor.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// List and stats
router.get('/', getDonors);
router.get('/:id', getDonorById);
router.get('/:id/assets', getDonorAssets);

// Administrative operations
router.post('/', authorizeRoles('SUPER_ADMIN', 'STAFF'), createDonor);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), updateDonor);
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), deleteDonor);

export default router;
