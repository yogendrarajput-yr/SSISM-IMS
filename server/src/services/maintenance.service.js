import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve paginated maintenance and repair logs with aggregate cost statistics.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {number} [params.assetId]
 * @param {string} [params.type]
 * @param {string} [params.search='']
 */
export const getMaintenanceLogsList = async ({
  page = 1,
  limit = 20,
  assetId,
  type,
  search = '',
}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (assetId) where.assetId = Number(assetId);
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { asset: { assetTag: { contains: search } } },
      { asset: { serialNumber: { contains: search } } },
      { vendorOrTechnician: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [logs, total, totalCost] = await Promise.all([
    prisma.maintenanceLog.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { performedAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            serialNumber: true,
            make: true,
            model: true,
            status: true,
          },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.maintenanceLog.count({ where }),
    prisma.maintenanceLog.aggregate({
      where,
      _sum: { cost: true },
    }),
  ]);

  return {
    logs,
    totalCost: totalCost._sum.cost || 0,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Record a hardware maintenance/upgrade activity and optionally update asset status.
 * 
 * @param {Object} data - Maintenance details (type, cost, vendor, description, updateAssetStatusTo)
 * @param {number} actorId - ID of staff/admin recording the activity
 * @param {string} ipAddress - Client IP address
 */
export const createMaintenanceLogRecord = async (data, actorId, ipAddress) => {

  const asset = await prisma.asset.findUnique({
    where: { id: Number(data.assetId) },
  });

  if (!asset) {
    throw new AppError('Asset not found.', 404);
  }

  const log = await prisma.$transaction(async (tx) => {
    const createdLog = await tx.maintenanceLog.create({
      data: {
        assetId: Number(data.assetId),
        performedById: actorId,
        type: data.type,
        cost: data.cost !== undefined ? data.cost : null,
        vendorOrTechnician: data.vendorOrTechnician || null,
        description: data.description,
        performedAt: new Date(),
      },
      include: {
        asset: true,
        performedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Optionally update asset status or condition if requested
    if (data.updateAssetStatusTo) {
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: data.updateAssetStatusTo,
          condition: data.updateAssetStatusTo === 'AVAILABLE' ? 'GOOD' : asset.condition,
        },
      });
    }

    await logAudit({
      actorId,
      action: 'MAINTENANCE_LOGGED',
      entityType: 'MaintenanceLog',
      entityId: createdLog.id,
      details: {
        assetTag: asset.assetTag,
        type: data.type,
        cost: data.cost,
        vendor: data.vendorOrTechnician,
        newStatus: data.updateAssetStatusTo || asset.status,
      },
      ipAddress,
      tx,
    });

    return createdLog;
  });

  return log;
};

/**
 * Delete a maintenance log record from the database.
 */
export const deleteMaintenanceLog = async (id, actorId, ipAddress) => {
  const parsedId = Number(id);
  const log = await prisma.maintenanceLog.findUnique({
    where: { id: parsedId },
    include: { asset: true },
  });

  if (!log) {
    throw new AppError('Maintenance log record not found.', 404);
  }

  await prisma.maintenanceLog.delete({ where: { id: parsedId } });

  await logAudit({
    actorId,
    action: 'MAINTENANCE_DELETED',
    entityType: 'MaintenanceLog',
    entityId: String(parsedId),
    details: {
      assetTag: log.asset?.assetTag,
      type: log.type,
      cost: log.cost,
    },
    ipAddress,
  });

  return { message: 'Maintenance record deleted successfully.' };
};

