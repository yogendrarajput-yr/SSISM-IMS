import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';
import { toId, toNullableId, toIdArray } from '../utils/idHelper.js';

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
      { modelNumber: { contains: search } },
      { location: { contains: search } },
      { simNumber: { contains: search } },
      { serviceProvider: { contains: search } },
      { planDetails: { contains: search } },
      { ipAddress: { contains: search } },
      { processor: { contains: search } },
      { generation: { contains: search } },
      { color: { contains: search } },
      { chargerSerial: { contains: search } },
      { remarks: { contains: search } },
    ];
  }

  if (status) where.status = status;

  if (category && category !== 'ALL') {
    if (category === 'PANELS_TVS') {
      where.category = { in: ['WHITEBOARD_PANEL', 'SMART_TV', 'INTERACTIVE_WHITEBOARD'] };
    } else if (category === 'ROUTERS_AIRFIBER') {
      where.category = { in: ['ROUTER', 'AIR_FIBER'] };
    } else if (category === 'PRINTERS_MONITORS') {
      where.category = { in: ['PRINTER', 'MONITOR'] };
    } else {
      where.category = category;
    }
  }

  if (condition) where.condition = condition;
  if (make) where.make = make;
  if (departmentId) where.departmentId = toId(departmentId);
  if (acquisitionSource) where.acquisitionSource = acquisitionSource;
  if (donorId) where.donorId = toId(donorId);

  const [assets, total, summary, acquisitionSummary, categorySummary, distinctMakes] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { id: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        donor: { select: { id: true, name: true, organization: true } },
        verifiedBy: { select: { id: true, name: true, email: true } },
        rechargeHistory: {
          take: 1,
          orderBy: { rechargeDate: 'desc' },
          select: { id: true, amount: true, rechargeDate: true, newExpiryDate: true, transactionId: true },
        },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            recipient: {
              select: { id: true, name: true, email: true, phone: true, rollNumberOrEmpId: true, role: true },
            },
          },
        },
      },
    }),
    prisma.asset.count({ where }),
    prisma.asset.groupBy({
      by: ['status'],
      where: departmentId ? { departmentId: toId(departmentId) } : {},
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ['acquisitionSource'],
      where: departmentId ? { departmentId: toId(departmentId) } : {},
      _count: { acquisitionSource: true },
    }),
    prisma.asset.groupBy({
      by: ['category'],
      where: { isArchived: false },
      _count: { category: true },
    }),
    prisma.asset.findMany({
      where: { isArchived: false },
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' },
    }),
  ]);

  const now = new Date();
  const enrichedAssets = assets.map((asset) => {
    let rechargeStatus = null;
    let daysRemaining = null;
    if (asset.category === 'AIR_FIBER' || asset.category === 'ROUTER' || asset.rechargeExpiryDate) {
      if (asset.rechargeExpiryDate) {
        const diffMs = new Date(asset.rechargeExpiryDate).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining > 7) {
          rechargeStatus = 'ACTIVE';
        } else if (daysRemaining >= 0) {
          rechargeStatus = 'EXPIRING_SOON';
        } else {
          rechargeStatus = 'EXPIRED';
        }
      } else {
        rechargeStatus = 'EXPIRED';
        daysRemaining = -1;
      }
    }
    return {
      ...asset,
      rechargeStatus,
      daysRemaining,
    };
  });

  return {
    assets: enrichedAssets,
    summary,
    acquisitionSummary,
    categorySummary,
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
    where: { id: toId(id) },
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
      // Physical Verification History Log
      verifiedBy: { select: { id: true, name: true, email: true } },
      physicalAudits: {
        orderBy: { verifiedAt: 'desc' },
        include: {
          verifiedBy: { select: { id: true, name: true, email: true } },
        },
      },
      // Hardware Repairs & Upgrades History Log
      maintenanceLogs: {
        orderBy: { performedAt: 'desc' },
        include: {
          performedBy: { select: { id: true, name: true, email: true } },
        },
      },
      // AirFiber & Router Recurring Recharge History
      rechargeHistory: {
        orderBy: { rechargeDate: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
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
      donorId: toNullableId(data.donorId),
      departmentId: toNullableId(data.departmentId),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      lastRechargeDate: data.lastRechargeDate ? new Date(data.lastRechargeDate) : null,
      rechargeExpiryDate: data.rechargeExpiryDate ? new Date(data.rechargeExpiryDate) : null,
      monthlyCost: data.monthlyCost ? Number(data.monthlyCost) : null,
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
    where: { id: toId(id) },
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
    assetData.donorId = toNullableId(assetData.donorId);
  }
  if (assetData.departmentId !== undefined) {
    assetData.departmentId = toNullableId(assetData.departmentId);
  }
  if (assetData.purchaseDate !== undefined) {
    assetData.purchaseDate = assetData.purchaseDate ? new Date(assetData.purchaseDate) : null;
  }
  if (assetData.warrantyExpiry !== undefined) {
    assetData.warrantyExpiry = assetData.warrantyExpiry ? new Date(assetData.warrantyExpiry) : null;
  }
  if (assetData.lastRechargeDate !== undefined) {
    assetData.lastRechargeDate = assetData.lastRechargeDate ? new Date(assetData.lastRechargeDate) : null;
  }
  if (assetData.rechargeExpiryDate !== undefined) {
    assetData.rechargeExpiryDate = assetData.rechargeExpiryDate ? new Date(assetData.rechargeExpiryDate) : null;
  }
  if (assetData.monthlyCost !== undefined) {
    assetData.monthlyCost = assetData.monthlyCost ? Number(assetData.monthlyCost) : null;
  }

  const updated = await prisma.asset.update({
    where: { id: toId(id) },
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
    where: { id: toId(id) },
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
    where: { id: toId(id) },
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
  const existing = await prisma.asset.findUnique({ where: { id: toId(id) } });
  if (!existing) throw new AppError('Asset not found.', 404);

  const restored = await prisma.asset.update({
    where: { id: toId(id) },
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

  const targetIds = toIdArray(ids);

  const activeIssued = await prisma.asset.findMany({
    where: {
      id: { in: targetIds },
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
    where: { id: { in: targetIds } },
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
    details: { count: result.count, assetIds: targetIds },
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
  const assetId = toId(id);
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

  const targetIds = toIdArray(ids);
  const deleted = [];
  const errors = [];

  for (const id of targetIds) {
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
  if (departmentId) assetWhere.departmentId = toId(departmentId);
  if (make) assetWhere.make = make;

  const feeWhere = {};
  if (departmentId) {
    feeWhere.student = { departmentId: toId(departmentId) };
  }

  const allocWhere = {};
  if (departmentId) {
    allocWhere.recipient = { departmentId: toId(departmentId) };
  }
  if (make) {
    allocWhere.asset = { make };
  }

  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalAssets,
    availableCount,
    issuedCount,
    maintenanceCount,
    retiredCount,
    dueThisWeekCount,
    dueThisMonthCount,
    upcomingReturns,
    conditionStats,
    departmentAssets,
    recentAllocations,
    recentMaintenance,
    feeStats,
    distinctMakes,
    airFiberDueCount,
    airFiberDueList,
  ] = await Promise.all([
    prisma.asset.count({ where: assetWhere }),
    prisma.asset.count({ where: { ...assetWhere, status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'ISSUED' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'UNDER_MAINTENANCE' } }),
    prisma.asset.count({ where: { ...assetWhere, status: 'RETIRED' } }),
    prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        ...allocWhere,
        OR: [
          { expectedReturnDate: { gte: now, lte: in7Days } },
          { expectedReturnDate: null, dueDate: { gte: now, lte: in7Days } },
        ],
      },
    }),
    prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        ...allocWhere,
        OR: [
          { expectedReturnDate: { gte: now, lte: in30Days } },
          { expectedReturnDate: null, dueDate: { gte: now, lte: in30Days } },
        ],
      },
    }),
    prisma.allocation.findMany({
      where: {
        status: 'ACTIVE',
        ...allocWhere,
        OR: [
          { expectedReturnDate: { gte: now, lte: in30Days } },
          { expectedReturnDate: null, dueDate: { gte: now, lte: in30Days } },
        ],
      },
      take: 8,
      orderBy: [
        { expectedReturnDate: 'asc' },
        { dueDate: 'asc' },
      ],
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            make: true,
            model: true,
            serialNumber: true,
            condition: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            rollNumberOrEmpId: true,
            role: true,
            email: true,
            phone: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        issuedBy: { select: { name: true } },
      },
    }),
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
    prisma.asset.count({
      where: {
        isArchived: false,
        category: { in: ['AIR_FIBER', 'ROUTER'] },
        OR: [
          { rechargeExpiryDate: { lte: in7Days } },
          { rechargeExpiryDate: null },
        ],
      },
    }),
    prisma.asset.findMany({
      where: {
        isArchived: false,
        category: { in: ['AIR_FIBER', 'ROUTER'] },
        OR: [
          { rechargeExpiryDate: { lte: in7Days } },
          { rechargeExpiryDate: null },
        ],
      },
      take: 6,
      orderBy: [
        { rechargeExpiryDate: 'asc' },
      ],
      select: {
        id: true,
        assetTag: true,
        category: true,
        make: true,
        model: true,
        location: true,
        serviceProvider: true,
        simNumber: true,
        rechargeExpiryDate: true,
        monthlyCost: true,
      },
    }),
  ]);

  return {
    metrics: {
      total: totalAssets,
      available: availableCount,
      issued: issuedCount,
      underMaintenance: maintenanceCount,
      retired: retiredCount,
      dueThisWeek: dueThisWeekCount,
      dueThisMonth: dueThisMonthCount,
      airFiberDueThisWeek: airFiberDueCount,
    },
    upcomingReturns,
    conditionStats,
    departmentAssets,
    recentAllocations,
    recentMaintenance,
    feeStats,
    airFiberDueList,
    makes: distinctMakes.map((m) => m.make).filter(Boolean),
  };
};

/**
 * Record a physical verification / audit check on a hardware asset.
 * Updates lastVerifiedAt, verifiedBy, auditStatus, remarks, and logs immutable entry.
 */
export const recordPhysicalVerification = async (id, data, actorId, ipAddress) => {
  const { auditStatus = 'PHYSICAL_OK', remarks } = data;
  const parsedId = toId(id);

  const asset = await prisma.asset.findUnique({
    where: { id: parsedId },
    include: {
      allocations: {
        where: { status: 'ACTIVE' },
        include: { recipient: true },
      },
    },
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404);
  }

  const validStatuses = ['PHYSICAL_OK', 'NEEDS_REPAIR', 'MISSING'];
  if (!validStatuses.includes(auditStatus)) {
    throw new AppError(`Invalid audit status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  // Adjust asset operational status if critical defects or missing
  let nextAssetStatus = asset.status;
  if (auditStatus === 'MISSING') {
    nextAssetStatus = 'RETIRED';
  } else if (auditStatus === 'NEEDS_REPAIR' && asset.status === 'AVAILABLE') {
    nextAssetStatus = 'UNDER_MAINTENANCE';
  }

  const [updatedAsset, auditEntry] = await prisma.$transaction([
    prisma.asset.update({
      where: { id: parsedId },
      data: {
        lastVerifiedAt: new Date(),
        verifiedById: actorId,
        auditStatus,
        verificationRemarks: remarks ? remarks.trim() : null,
        status: nextAssetStatus,
      },
      include: {
        verifiedBy: { select: { id: true, name: true, email: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            recipient: { select: { id: true, name: true, rollNumberOrEmpId: true, role: true } },
          },
        },
      },
    }),
    prisma.physicalAuditLog.create({
      data: {
        assetId: parsedId,
        verifiedById: actorId,
        auditStatus,
        remarks: remarks ? remarks.trim() : null,
        verifiedAt: new Date(),
      },
      include: {
        verifiedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  await logAudit({
    actorId,
    action: 'PHYSICAL_VERIFICATION_RECORDED',
    entityType: 'Asset',
    entityId: String(parsedId),
    details: {
      assetTag: asset.assetTag,
      auditStatus,
      remarks,
      previousStatus: asset.status,
      nextStatus: nextAssetStatus,
    },
    ipAddress,
  });

  return { asset: updatedAsset, audit: auditEntry };
};

/**
 * Filterable Physical Audit & Overdue Verification Report
 * Identifies laptops overdue for 6-month or 1-year verification, highlighting student-assigned assets.
 */
export const getPhysicalAuditOverdueReport = async ({
  period = '6_MONTHS', // '6_MONTHS' | '1_YEAR' | 'ALL'
  onlyStudentAssigned = 'false',
  auditStatus,
  search = '',
  page = 1,
  limit = 15,
}) => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);
  const oneYearAgo = new Date(now.getTime() - 365 * 86400000);

  const where = { isArchived: false, category: 'LAPTOP' };

  if (auditStatus) {
    if (auditStatus === 'UNVERIFIED') {
      where.lastVerifiedAt = null;
    } else if (auditStatus === 'PHYSICAL_OK') {
      where.lastVerifiedAt = { not: null };
      where.auditStatus = 'PHYSICAL_OK';
    } else {
      where.auditStatus = auditStatus;
    }
  } else {
    if (period === '6_MONTHS') {
      where.OR = [
        { lastVerifiedAt: null },
        { lastVerifiedAt: { lt: sixMonthsAgo } },
      ];
    } else if (period === '1_YEAR') {
      where.OR = [
        { lastVerifiedAt: null },
        { lastVerifiedAt: { lt: oneYearAgo } },
      ];
    }
  }

  if (onlyStudentAssigned === 'true') {
    where.allocations = {
      some: {
        status: 'ACTIVE',
        recipient: { role: 'STUDENT' },
      },
    };
  }

  if (search && search.trim()) {
    const term = search.trim();
    const searchFilter = {
      OR: [
        { assetTag: { contains: term } },
        { serialNumber: { contains: term } },
        { model: { contains: term } },
        { make: { contains: term } },
        { allocations: { some: { status: 'ACTIVE', recipient: { name: { contains: term } } } } },
        { allocations: { some: { status: 'ACTIVE', recipient: { rollNumberOrEmpId: { contains: term } } } } },
      ],
    };

    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        searchFilter,
      ];
      delete where.OR;
    } else {
      Object.assign(where, searchFilter);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [
    assets,
    total,
    allOverdue6Months,
    allOverdue1Year,
    studentOverdueCount,
    unverifiedCount,
    physicalOkCount,
    needsRepairCount,
    missingCount,
  ] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: [
        { lastVerifiedAt: 'asc' }, // Unverified / oldest first
        { id: 'desc' },
      ],
      include: {
        department: { select: { id: true, name: true, code: true } },
        verifiedBy: { select: { id: true, name: true, email: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                rollNumberOrEmpId: true,
                role: true,
                branch: true,
                batchYear: true,
                department: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    }),
    prisma.asset.count({ where }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: sixMonthsAgo } }],
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: oneYearAgo } }],
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: sixMonthsAgo } }],
        allocations: { some: { status: 'ACTIVE', recipient: { role: 'STUDENT' } } },
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        lastVerifiedAt: null,
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        lastVerifiedAt: { not: null },
        auditStatus: 'PHYSICAL_OK',
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        auditStatus: 'NEEDS_REPAIR',
      },
    }),
    prisma.asset.count({
      where: {
        isArchived: false,
        category: 'LAPTOP',
        auditStatus: 'MISSING',
      },
    }),
  ]);

  // Enrich assets with overdue calculations and student assignment flags
  const enrichedAssets = assets.map((asset) => {
    const activeAlloc = asset.allocations?.[0];
    const isStudentAssigned = activeAlloc?.recipient?.role === 'STUDENT';
    const lastDate = asset.lastVerifiedAt ? new Date(asset.lastVerifiedAt) : null;
    const daysSince = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / 86400000) : null;

    return {
      ...asset,
      activeAllocation: activeAlloc || null,
      currentHolder: activeAlloc?.recipient || null,
      isStudentAssigned,
      daysSinceVerification: daysSince,
      isOverdue6Months: !lastDate || daysSince > 180,
      isOverdue1Year: !lastDate || daysSince > 365,
    };
  });

  return {
    assets: enrichedAssets,
    metrics: {
      totalOverdue6Months: allOverdue6Months,
      totalOverdue1Year: allOverdue1Year,
      studentAssignedOverdueCount: studentOverdueCount,
      statusCounts: {
        UNVERIFIED: unverifiedCount,
        PHYSICAL_OK: physicalOkCount,
        NEEDS_REPAIR: needsRepairCount,
        MISSING: missingCount,
      },
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Log a recharge for AirFiber / Router hardware assets.
 * 
 * @param {number|string} assetId
 * @param {Object} data
 * @param {number} actorId
 * @param {string} ipAddress
 */
export const logRecharge = async (assetId, data, actorId, ipAddress) => {
  const asset = await prisma.asset.findUnique({
    where: { id: toId(assetId) },
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404);
  }

  const rechargeDate = data.rechargeDate ? new Date(data.rechargeDate) : new Date();
  const validityDays = data.validityDays ? Number(data.validityDays) : 30;

  let newExpiryDate;
  if (data.newExpiryDate) {
    newExpiryDate = new Date(data.newExpiryDate);
  } else {
    // If current expiry is in the future, extend from current expiry date, else from recharge date
    const baseDate =
      asset.rechargeExpiryDate && new Date(asset.rechargeExpiryDate) > rechargeDate
        ? new Date(asset.rechargeExpiryDate)
        : new Date(rechargeDate);
    newExpiryDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
  }

  const rechargeAmount = Number(data.amount ?? data.rechargeAmount);

  const [rechargeRecord, updatedAsset] = await prisma.$transaction([
    prisma.rechargeHistory.create({
      data: {
        assetId: toId(assetId),
        amount: rechargeAmount,
        validityDays,
        rechargeDate,
        newExpiryDate,
        transactionId: data.transactionId || data.receiptNumber || null,
        paymentMode: data.paymentMode || 'UPI',
        serviceProvider: data.serviceProvider || asset.serviceProvider || 'JIO',
        planDetails: data.planDetails || asset.planDetails || null,
        notes: data.notes || data.remarks || null,
        createdById: toNullableId(actorId),
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.asset.update({
      where: { id: toId(assetId) },
      data: {
        lastRechargeDate: rechargeDate,
        rechargeExpiryDate: newExpiryDate,
        ...(data.serviceProvider ? { serviceProvider: data.serviceProvider } : {}),
        ...(data.planDetails ? { planDetails: data.planDetails } : {}),
        ...(rechargeAmount ? { monthlyCost: rechargeAmount } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  await logAudit({
    actorId,
    action: 'AIRFIBER_RECHARGED',
    entityType: 'Asset',
    entityId: asset.id,
    details: {
      amount: data.amount,
      validityDays,
      transactionId: data.transactionId,
      newExpiryDate,
    },
    ipAddress,
  });

  return { rechargeRecord, asset: updatedAsset };
};

/**
 * Retrieve recharge history for a specific asset.
 */
export const getRechargeHistory = async (assetId) => {
  const history = await prisma.rechargeHistory.findMany({
    where: { assetId: toId(assetId) },
    orderBy: { rechargeDate: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });
  return history;
};

/**
 * Retrieve AirFiber & Routers recharge due / expiring report.
 */
export const getRechargeDueReport = async () => {
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: {
      isArchived: false,
      category: { in: ['AIR_FIBER', 'ROUTER'] },
    },
    orderBy: [{ rechargeExpiryDate: 'asc' }],
    include: {
      department: { select: { id: true, name: true, code: true } },
      rechargeHistory: {
        take: 1,
        orderBy: { rechargeDate: 'desc' },
      },
    },
  });

  // Calculate status for each asset: ACTIVE, EXPIRING_SOON, EXPIRED
  const categorized = assets.map((a) => {
    let rechargeStatus = 'EXPIRED';
    let daysRemaining = 0;
    if (a.rechargeExpiryDate) {
      const diffMs = new Date(a.rechargeExpiryDate).getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining > 7) {
        rechargeStatus = 'ACTIVE';
      } else if (daysRemaining >= 0) {
        rechargeStatus = 'EXPIRING_SOON';
      } else {
        rechargeStatus = 'EXPIRED';
      }
    } else {
      rechargeStatus = 'EXPIRED';
      daysRemaining = -1;
    }
    return {
      ...a,
      rechargeStatus,
      daysRemaining,
    };
  });

  const dueThisWeek = categorized.filter((a) => a.rechargeStatus === 'EXPIRING_SOON');
  const expired = categorized.filter((a) => a.rechargeStatus === 'EXPIRED');
  const active = categorized.filter((a) => a.rechargeStatus === 'ACTIVE');

  return {
    all: categorized,
    dueThisWeek,
    expired,
    active,
    counts: {
      total: categorized.length,
      dueThisWeek: dueThisWeek.length,
      expired: expired.length,
      active: active.length,
    },
  };
};

