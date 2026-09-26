import { Router } from 'express';
import multer from 'multer';
import {
  getStudents,
  createStudent,
  bulkImportStudents,
  downloadStudentTemplate,
  getStaff,
  createStaff,
  bulkImportStaff,
  downloadStaffTemplate,
  getUserDetails,
  updateUser,
  archiveUser,
  restoreUser,
  bulkArchiveUsers,
  exportUsers,
  deleteUser,
  bulkDeleteUsers,
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.use(authenticate);

// Student Directory Routes
router.get('/students', getStudents);
router.post('/students', authorizeRoles('SUPER_ADMIN', 'STAFF'), createStudent);
router.post('/students/bulk-import', authorizeRoles('SUPER_ADMIN', 'STAFF'), upload.single('file'), bulkImportStudents);
router.get('/students/template', downloadStudentTemplate);

// Staff & Faculty Directory Routes
router.get('/staff', getStaff);
router.post('/staff', authorizeRoles('SUPER_ADMIN', 'STAFF'), createStaff);
router.post('/staff/bulk-import', authorizeRoles('SUPER_ADMIN', 'STAFF'), upload.single('file'), bulkImportStaff);
router.get('/staff/template', downloadStaffTemplate);

// Bulk Operations
router.get('/export', exportUsers);
router.post('/bulk-archive', authorizeRoles('SUPER_ADMIN', 'STAFF'), bulkArchiveUsers);
router.post('/bulk-delete', authorizeRoles('SUPER_ADMIN', 'STAFF'), bulkDeleteUsers);

// Single User Operations
router.get('/:id', getUserDetails);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), updateUser);
router.patch('/:id/archive', authorizeRoles('SUPER_ADMIN', 'STAFF'), archiveUser);
router.patch('/:id/restore', authorizeRoles('SUPER_ADMIN'), restoreUser);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'STAFF'), deleteUser);

export default router;
