import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve paginated asset list with multi-column filtering.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.search='']
 * @param {string} [params.status]
 * @param {string} [params.category]
 * @param {string} [params.condition]
 * @param {number} [params.departmentId]
 * @param {string} [params.make]
 */
export const getAssetsList = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
  category,
  condition,
  departmentId,
  make,
  acquisitionSource,
  donorId,
}) => {

  const skip = (Number(page) - 1) * Number(limit);
  const where = { isArchived: false };

  if (search) {
    where.OR = [
      { assetTag: { contains: search } },
      { serialNumber: { contains: search } },
      { model: { contains: search } },
      { make: { contains: search } },
      { processor: { contains: search } },
      { generation: { contains: search } },
      { color: { contains: search } },
      { chargerSerial: { contains: search } },
      { remarks: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (make) where.make = make;
  if (departmentId) where.departmentId = Number(departmentId);
  if (acquisitionSource) where.acquisitionSource = acquisitionSource;
  if (donorId) where.donorId = Number(donorId);

  const [assets, total, summary, acquisitionSummary, distinctMakes] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { id: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        donor: { select: { id: true, name: true, organization: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            recipient: {
              select: { id: true, name: true, email: true, rollNumberOrEmpId: true, role: true },
            },
          },
        },
      },
    }),
    prisma.asset.count({ where }),
    prisma.asset.groupBy({
      by: ['status'],
      where: departmentId ? { departmentId: Number(departmentId) } : {},
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ['acquisitionSource'],
      where: departmentId ? { departmentId: Number(departmentId) } : {},
      _count: { acquisitionSource: true },
    }),
    prisma.asset.findMany({
      where: { isArchived: false },
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    }),
  ]);

  return {
    assets,
    summary,
    acquisitionSummary,
    makes: distinctMakes.map((m) => m.make).filter(Boolean),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Retrieve single asset with complete lifecycle timeline and maintenance logs.
 * 
 * @param {number|string} id - Asset primary key
 */
export const getAssetById = async (id) => {
  const asset = await prisma.asset.findUnique({
    where: { id: Number(id) },
    include: {
      department: { select: { id: true, name: true, code: true } },
      donor: {
        select: {
          id: true,
          name: true,
          organization: true,
          email: true,
          phone: true,
          donationDate: true,
        },
      },
      // Comprehensive Lifecycle Timeline History (even when AVAILABLE)
      allocations: {
        orderBy: { issuedAt: 'desc' },
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNumberOrEmpId: true,
              role: true,
              department: { select: { name: true, code: true } },
            },
          },
          issuedBy: { select: { id: true, name: true, email: true } },
          returnedBy: { select: { id: true, name: true, email: true } },
        },
      },
      // Hardware Repairs & Upgrades History Log
      maintenanceLogs: {
        orderBy: { performedAt: 'desc' },
        include: {
          performedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404);
  }

  return asset;
};

/**
 * Register a new hardware asset in inventory with uniqueness check and audit trail.
 * 
 * @param {Object} data - Asset fields
 * @param {number} actorId - ID of staff/admin registering the asset
 * @param {string} ipAddress - Client IP address
 */
export const createAsset = async (data, actorId, ipAddress) => {

  const existing = await prisma.asset.findFirst({
    where: {
      OR: [
        { assetTag: data.assetTag },
        { serialNumber: data.serialNumber },
      ],
    },
  });

  if (existing) {
    if (existing.assetTag === data.assetTag) {
      throw new AppError(`Asset Tag '${data.assetTag}' is already registered.`, 409);
    }
    throw new AppError(`Serial Number '${data.serialNumber}' is already registered.`, 409);
  }

  const asset = await prisma.asset.create({
    data: {
      ...data,
      donorId: data.donorId ? Number(data.donorId) : null,
      departmentId: data.departmentId ? Number(data.departmentId) : null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      donor: { select: { id: true, name: true, organization: true } },
    },
  });

  await logAudit({
    actorId,
    action: 'ASSET_CREATED',
    entityType: 'Asset',
    entityId: asset.id,
    details: { assetTag: asset.assetTag, serialNumber: asset.serialNumber, make: asset.make, model: asset.model },
    ipAddress,
  });

  return asset;
};

/**
 * Update asset specifications, condition, department or dynamic attributes.
 * 
 * @param {number|string} id - Asset primary key
 * @param {Object} data - Updated attributes
 * @param {number} actorId - ID of user updating the asset
 * @param {string} ipAddress - Client IP address
 */
export const updateAsset = async (id, data, actorId, ipAddress) => {
  const existing = await prisma.asset.findUnique({
    where: { id: Number(id) },
  });

  if (!existing) {
    throw new AppError('Asset not found.', 404);
  }

  // If updating tags or serial, check uniqueness
  if (data.assetTag && data.assetTag !== existing.assetTag) {
    const duplicateTag = await prisma.asset.findUnique({ where: { assetTag: data.assetTag } });
    if (duplicateTag) throw new AppError(`Asset Tag '${data.assetTag}' is already taken.`, 409);
  }

  if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
    const duplicateSerial = await prisma.asset.findUnique({ where: { serialNumber: data.serialNumber } });
    if (duplicateSerial) throw new AppError(`Serial Number '${data.serialNumber}' is already taken.`, 409);
  }

  const assetData = { ...data };
  if (assetData.donorId !== undefined) {
    assetData.donorId = assetData.donorId ? Number(assetData.donorId) : null;
  }
  if (assetData.departmentId !== undefined) {
    assetData.departmentId = assetData.departmentId ? Number(assetData.departmentId) : null;
  }
  if (assetData.purchaseDate !== undefined) {
    assetData.purchaseDate = assetData.purchaseDate ? new Date(assetData.purchaseDate) : null;
  }
  if (assetData.warrantyExpiry !== undefined) {
    assetData.warrantyExpiry = assetData.warrantyExpiry ? new Date(assetData.warrantyExpiry) : null;
  }

  const updated = await prisma.asset.update({
    where: { id: Number(id) },
    data: assetData,
    include: {
      department: { select: { id: true, name: true, code: true } },
      donor: { select: { id: true, name: true, organization: true } },
    },
  });

  await logAudit({
    actorId,
    action: 'ASSET_UPDATED',
    entityType: 'Asset',
    entityId: updated.id,
    details: { changes: data },
    ipAddress,
  });

  return updated;
};

/**
 * Soft-delete an unallocated hardware asset from inventory with Active Constraint Lock.
 * 
 * @param {number|string} id - Asset primary key
 * @param {number} actorId - ID of user performing archive
 * @param {string} ipAddress - Client IP address
 */
export const archiveAsset = async (id, actorId, ipAddress) => {
  const existing = await prisma.asset.findUnique({
    where: { id: Number(id) },
    include: {
      allocations: { where: { status: 'ACTIVE' } },
    },
  });

  if (!existing) {
    throw new AppError('Asset not found.', 404);
  }

  if (existing.status === 'ISSUED' || existing.allocations.length > 0) {
    throw new AppError(
      `Active Constraint Lock: Cannot archive laptop '${existing.assetTag}' because it is currently ISSUED to a student or faculty member. Return the laptop first.`,
      409
    );
  }

  const archived = await prisma.asset.update({
    where: { id: Number(id) },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  await logAudit({
    actorId,
    action: 'ASSET_ARCHIVED',
    entityType: 'Asset',
    entityId: String(id),
    details: { assetTag: existing.assetTag, serialNumber: existing.serialNumber },
    ipAddress,
  });

  return { message: `Asset '${existing.assetTag}' archived successfully.`, asset: archived };
};

/**
 * Restore a soft-deleted hardware asset back to active inventory.
 */
export const restoreAsset = async (id, actorId, ipAddress) => {
  const existing = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError('Asset not found.', 404);

  const restored = await prisma.asset.update({
    where: { id: Number(id) },
    data: {
      isArchived: false,
      archivedAt: null,
    },
  });

  await logAudit({
    actorId,
    action: 'ASSET_RESTORED',
    entityType: 'Asset',
    entityId: String(id),
    details: { assetTag: existing.assetTag, serialNumber: existing.serialNumber },
    ipAddress,
  });

  return { message: `Asset '${existing.assetTag}' restored successfully.`, asset: restored };
};

/**
 * Bulk archive multiple hardware assets with Active Constraint Lock.
 */
export const bulkArchiveAssets = async (ids, actorId, ipAddress) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError('No asset IDs provided for bulk archiving.', 400);
  }

  const numericIds = ids.map((id) => Number(id)).filter((n) => !isNaN(n) && n > 0);

  const activeIssued = await prisma.asset.findMany({
    where: {
      id: { in: numericIds },
      OR: [
        { status: 'ISSUED' },
        { allocations: { some: { status: 'ACTIVE' } } },
      ],
    },
    select: { assetTag: true },
  });

  if (activeIssued.length > 0) {
    const lockedTags = activeIssued.map((a) => `'${a.assetTag}'`).join(', ');
    throw new AppError(
      `Active Constraint Lock: Bulk archive aborted. The following laptop(s) are currently ISSUED: ${lockedTags}. Return them first.`,
      409
    );
  }

  const result = await prisma.asset.updateMany({
    where: { id: { in: numericIds } },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  await logAudit({
    actorId,
    action: 'BULK_ASSET_ARCHIVE',
    entityType: 'Asset',
    entityId: `BULK-ASSET-${Date.now()}`,
    details: { count: result.count, assetIds: numericIds },
    ipAddress,
  });

  return { success: true, archivedCount: result.count };
};

/**
 * Delete an unallocated hardware asset from inventory (Super Admin only).
 * 
 * @param {number|string} id - Asset primary key
 * @param {number} actorId - ID of Super Admin performing deletion
 * @param {string} ipAddress - Client IP address
 */
export const deleteAsset = async (id, actorId, ipAddress) => {
  const assetId = Number(id);
  const existing = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      allocations: { where: { status: 'ACTIVE' } },
    },
  });

  if (!existing) {
    throw new AppError('Asset not found.', 404);
  }

  if (existing.status === 'ISSUED' || (existing.allocations && existing.allocations.length > 0)) {
    throw new AppError('Cannot delete an asset that is currently issued to a student or faculty. Please return the asset first.', 400);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Clean up maintenance logs
    await tx.maintenanceLog.deleteMany({ where: { assetId } });
    // 2. Clean up historical allocations
    await tx.allocation.deleteMany({ where: { assetId } });
    // 3. Delete the asset record
    await tx.asset.delete({ where: { id: assetId } });
  });

  await logAudit({
    actorId,
    action: 'ASSET_DELETED',
    entityType: 'Asset',
    entityId: String(assetId),
    details: { assetTag: existing.assetTag, serialNumber: existing.serialNumber },
    ipAddress,
  });

  return { message: `Asset '${existing.assetTag}' deleted successfully from database.` };
};

/**
 * Bulk delete multiple assets from database.
 */
export const bulkDeleteAssets = async (ids, actorId, ipAddress) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('A list of asset IDs is required for bulk deletion.', 400);
  }

  const numericIds = ids.map(Number);
  const deleted = [];
  const errors = [];

  for (const id of numericIds) {
    try {
      await deleteAsset(id, actorId, ipAddress);
      deleted.push(id);
    } catch (err) {
      errors.push({ id, reason: err.message });
    }
  }

  return {
    message: `Bulk asset deletion processed. Successfully deleted ${deleted.length} asset(s).`,
    deletedCount: deleted.length,
    failedCount: errors.length,
    errors,
  };
};

/**
 * Rapid multi-entity search across hardware inventory and college users.
 * 
 * @param {string} query - Keyword search term
 */
export const globalQuickSearch = async (query) => {

  if (!query || query.trim().length < 2) return { assets: [], users: [] };

  const q = query.trim();

  const [assets, users] = await Promise.all([
    prisma.asset.findMany({
      where: {
        OR: [
          { assetTag: { contains: q } },
          { serialNumber: { contains: q } },
          { model: { contains: q } },
          { make: { contains: q } },
        ],
      },
      take: 8,
      include: {
        allocations: {
          where: { status: 'ACTIVE' },
          include: { recipient: { select: { name: true, rollNumberOrEmpId: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { rollNumberOrEmpId: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 8,
      include: {
        department: { select: { code: true } },
        receivedAllocations: {
          where: { status: 'ACTIVE' },
          include: { asset: { select: { assetTag: true, model: true } } },
        },
      },
    }),
  ]);

  return { assets, users };
};

/**
 * Aggregate real-time campus dashboard analytics and metrics:
 * Total stock counts by status, physical conditions, department breakdowns,
 * recent allocations, recent maintenance activities, and license fee summaries.
 */
export const getDashboardMetrics = async ({ departmentId, make } = {}) => {
  const assetWhere = { isArchived: false };
  if (departmentId) assetWhere.departmentId = Number(departmentId);
  if (make) assetWhere.make = make;

  const feeWhere = {};
  if (departmentId) {
    feeWhere.student = { departmentId: Number(departmentId) };
  }

  const allocWhere = {};
  if (departmentId) {
    allocWhere.recipient = { departmentId: Number(departmentId) };
  }
  if (make) {
    allocWhere.asset = { make };
  }

  const [
    totalAssets,
    availableCount,
    issuedCount,
    maintenanceCount,
    retiredCount,
    conditionStats,
    departmentAssets,
    recentAllocations,
    recentMaintenance,
    feeStats,
    distinctMakes,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.count({ where: { ...assetWhere, status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'ISSUED' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'UNDER_MAINTENANCE' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'RETIRED' } }),
    prisma.asset.groupBy({
      by: ['condition'],
      where: assetWhere,
      _count: { condition: true },
    }),
    prisma.department.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        code: true,
        _count: { select: { assets: true, users: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.allocation.findMany({
      where: allocWhere,
      take: 5,
      orderBy: { issuedAt: 'desc' },
      include: {
        asset: { select: { assetTag: true, model: true } },
        recipient: { select: { name: true, rollNumberOrEmpId: true, role: true } },
        issuedBy: { select: { name: true } },
      },
    }),
    prisma.maintenanceLog.findMany({
      where: make ? { asset: { make } } : {},
      take: 5,
      orderBy: { performedAt: 'desc' },
      include: {
        asset: { select: { assetTag: true, model: true } },
      },
    }),
    prisma.licenseFeeRecord.groupBy({
      by: ['status'],
      where: feeWhere,
      _count: { status: true },
      _sum: { amount: true },
    }),
    prisma.asset.findMany({
      where: { isArchived: false },
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    }),
  ]);

  return {
    metrics: {
      total: totalAssets,
      available: availableCount,
      issued: issuedCount,
      underMaintenance: maintenanceCount,
      retired: retiredCount,
    },
    conditionStats,
    departmentAssets,
    recentAllocations,
    recentMaintenance,
    feeStats,
    makes: distinctMakes.map((m) => m.make).filter(Boolean),
  };
};
