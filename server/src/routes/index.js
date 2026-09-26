import { Router } from 'express';
import authRoutes from './auth.routes.js';
import assetRoutes from './asset.routes.js';
import allocationRoutes from './allocation.routes.js';
import feeRoutes from './fee.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import auditRoutes from './audit.routes.js';
import importExportRoutes from './importExport.routes.js';
import donorRoutes from './donor.routes.js';
import settingsRoutes from './settings.routes.js';
import userRoutes from './user.routes.js';
import { prisma } from '../config/db.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/allocations', allocationRoutes);
router.use('/fees', feeRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/data', importExportRoutes);
router.use('/donors', donorRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', userRoutes);

/**
 * GET /api/departments
 * Fetch list of all college academic & administrative departments with asset counts.
 */
router.get('/departments', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assets: true, users: true } },
      },
    });
    res.status(200).json({ success: true, data: { departments } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/recipients
 * Fetch candidates (Students & Faculty) for the allocation modal with active allocation status and license fees.
 */
router.get('/recipients', authenticate, async (req, res, next) => {

  try {
    const { search, role, departmentId } = req.query;
    const where = {
      role: role ? role : { in: ['STUDENT', 'FACULTY'] },
      isActive: true,
      isArchived: false,
    };

    if (departmentId) where.departmentId = Number(departmentId);
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { rollNumberOrEmpId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const recipients = await prisma.user.findMany({
      where,
      take: 50,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumberOrEmpId: true,
        role: true,
        batchYear: true,
        department: { select: { id: true, name: true, code: true } },
        receivedAllocations: {
          where: { status: 'ACTIVE' },
          select: { id: true, asset: { select: { assetTag: true, model: true } } },
        },
        licenseFeeRecords: {
          take: 1,
          orderBy: { academicYear: 'desc' },
          select: { status: true, amount: true, academicYear: true },
        },
      },
    });

    res.status(200).json({ success: true, data: { recipients } });
  } catch (err) {
    next(err);
  }
});

export default router;
