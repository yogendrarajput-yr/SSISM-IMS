import { Router } from 'express';
import {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  archiveAsset,
  restoreAsset,
  bulkArchiveAssets,
  deleteAsset,
  bulkDeleteAssets,
  searchAssets,
  getDashboardStats,
} from '../controllers/asset.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAssetSchema, updateAssetSchema } from '../utils/validators.js';

/**
 * Asset Routes (/api/assets)
 * Manages inventory master catalog, dynamic JSON specs, analytics, and lifecycle status.
 */
const router = Router();

// Publicly authenticated within campus
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/search', searchAssets);
router.get('/', getAssets);
router.get('/:id', getAsset);

// Staff & Super Admin can create/modify/archive
router.post('/', authorizeRoles('SUPER_ADMIN', 'STAFF'), validate(createAssetSchema), createAsset);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), validate(updateAssetSchema), updateAsset);
router.patch('/:id/archive', authorizeRoles('SUPER_ADMIN', 'STAFF'), archiveAsset);
router.patch('/:id/restore', authorizeRoles('SUPER_ADMIN'), restoreAsset);
router.post('/bulk-archive', authorizeRoles('SUPER_ADMIN', 'STAFF'), bulkArchiveAssets);
router.post('/bulk-delete', authorizeRoles('SUPER_ADMIN', 'STAFF'), bulkDeleteAssets);

// Delete asset
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), deleteAsset);

export default router;
