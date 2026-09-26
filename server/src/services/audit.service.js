import { prisma } from '../config/db.js';

/**
 * Record an immutable audit log entry for security and accountability.
 * Supports transactional attachment via `tx` parameter.
 * 
 * @param {Object} params
 * @param {number} [params.actorId] - User initiating the action
 * @param {string} params.action - Action identifier (e.g. 'ASSET_CREATED', 'USER_LOGIN')
 * @param {string} params.entityType - Target entity type (e.g. 'Asset', 'Allocation')
 * @param {string|number} params.entityId - Primary identifier of entity
 * @param {Object} [params.details] - JSON serializable snapshot of payload or diff
 * @param {string} [params.ipAddress] - Request IP address
 * @param {Object} [params.tx] - Optional active Prisma transaction
 */
export const logAudit = async ({
  actorId,
  action,
  entityType,
  entityId,
  details = null,
  ipAddress = null,
  tx = prisma,
}) => {
  try {
    return await tx.auditLog.create({
      data: {
        actorId: actorId ? Number(actorId) : null,
        action,
        entityType,
        entityId: String(entityId),
        details: details || {},
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't fail parent transaction unless critical
    return null;
  }
};

/**
 * Fetch chronological paginated audit log entries with multi-filter support.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=25]
 * @param {string} [params.action]
 * @param {string} [params.entityType]
 * @param {number} [params.actorId]
 */
export const getAuditLogsList = async ({ page = 1, limit = 25, action, entityType, actorId }) => {

  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = Number(actorId);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            rollNumberOrEmpId: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Delete a single audit log entry from database.
 */
export const deleteAuditLog = async (id) => {
  const parsedId = Number(id);
  const existing = await prisma.auditLog.findUnique({ where: { id: parsedId } });
  if (!existing) {
    throw new AppError('Audit log entry not found.', 404);
  }
  await prisma.auditLog.delete({ where: { id: parsedId } });
  return { message: 'Audit log entry deleted successfully.' };
};

/**
 * Purge / Clear all audit logs from database (Super Admin only).
 */
export const purgeAuditLogs = async (actorId, ipAddress) => {
  const result = await prisma.auditLog.deleteMany({});

  // Re-record purge action for governance
  await logAudit({
    actorId,
    action: 'AUDIT_LOGS_PURGED',
    entityType: 'AuditLog',
    entityId: 'ALL',
    details: { purgedCount: result.count },
    ipAddress,
  });

  return { message: `Successfully purged ${result.count} audit log records.`, count: result.count };
};

