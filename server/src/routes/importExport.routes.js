import { Router } from 'express';
import multer from 'multer';
import {
  importAssets,
  importStudents,
  exportAssets,
  exportAllocations,
  downloadReceipt,
  downloadAssetSampleTemplate,
  downloadStudentSampleTemplate,
} from '../controllers/importExport.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';

// Multer memory storage configuration for file uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Bulk Data Import & Export Routes (/api/data)
 * Handles CSV ingestion, Excel report generation, and PDF receipt rendering.
 */
const router = Router();

router.use(authenticate);

// Sample Excel Templates
router.get('/template/assets', downloadAssetSampleTemplate);
router.get('/template/students', downloadStudentSampleTemplate);

// Bulk Imports
router.post(
  '/import/assets',
  authorizeRoles('SUPER_ADMIN', 'STAFF'),
  upload.single('file'),
  importAssets
);

router.post(
  '/import/students',
  authorizeRoles('SUPER_ADMIN', 'STAFF'),
  upload.single('file'),
  importStudents
);

// Bulk Exports
router.get('/export/assets', exportAssets);
router.get('/export/allocations', exportAllocations);

// Printable PDF receipt download
router.get('/receipt/:allocationId/pdf', downloadReceipt);

export default router;

