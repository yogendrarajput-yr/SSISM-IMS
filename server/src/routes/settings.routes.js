import { Router } from 'express';
import {
  getMasterSettings,
  getArchived,
  createDepartment,
  updateDepartment,
  archiveDepartment,
  restoreDepartment,
  deleteDepartment,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/settings.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

// View overview and universal archived records
router.get('/', getMasterSettings);
router.get('/archived', authorizeRoles('SUPER_ADMIN'), getArchived);

// Department management (Super Admin only)
router.post('/departments', authorizeRoles('SUPER_ADMIN'), createDepartment);
router.put('/departments/:id', authorizeRoles('SUPER_ADMIN'), updateDepartment);
router.patch('/departments/:id/archive', authorizeRoles('SUPER_ADMIN'), archiveDepartment);
router.patch('/departments/:id/restore', authorizeRoles('SUPER_ADMIN'), restoreDepartment);
router.delete('/departments/:id', authorizeRoles('SUPER_ADMIN'), deleteDepartment);

// Category management (Super Admin & Staff)
router.post('/categories', authorizeRoles('SUPER_ADMIN'), createCategory);
router.put('/categories/:id', authorizeRoles('SUPER_ADMIN'), updateCategory);
router.delete('/categories/:id', authorizeRoles('SUPER_ADMIN'), deleteCategory);

export default router;
