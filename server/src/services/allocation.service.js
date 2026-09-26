import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve paginated allocations list with search, status, and department filtering.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.status] - Filter by ACTIVE or RETURNED
 * @param {number} [params.departmentId] - Filter by recipient department
 * @param {string} [params.search=''] - Keyword search
 */
export const getAllocationsList = async ({
  page = 1,
  limit = 15,
  status,
  departmentId,
  search = '',
  startDate,
  endDate,
}) => {

  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (status === 'OVERDUE') {
    where.status = 'ACTIVE';
    where.dueDate = { lt: new Date() };
  } else if (status) {
    where.status = status;
  }

  if (departmentId) {
    where.recipient = { departmentId: Number(departmentId) };
  }

  if (startDate || endDate) {
    where.issuedAt = {};
    if (startDate) where.issuedAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.issuedAt.lte = end;
    }
  }

  if (search) {
    where.OR = [
      { asset: { assetTag: { contains: search } } },
      { asset: { serialNumber: { contains: search } } },
      { recipient: { name: { contains: search } } },
      { recipient: { rollNumberOrEmpId: { contains: search } } },
    ];
  }

  const [
    allocations,
    total,
    totalIssued,
    activeCount,
    returnedCount,
    overdueCount,
  ] = await Promise.all([
    prisma.allocation.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { issuedAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            serialNumber: true,
            make: true,
            model: true,
            processor: true,
            ram: true,
            storage: true,
            chargerSerial: true,
            hasBag: true,
            hasMouse: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumberOrEmpId: true,
            role: true,
            department: { select: { id: true, name: true, code: true } },
            licenseFeeRecords: {
              take: 1,
              orderBy: { academicYear: 'desc' },
              select: { status: true, amount: true, academicYear: true },
            },
          },
        },
        issuedBy: { select: { id: true, name: true, email: true } },
        returnedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.allocation.count({ where }),
    prisma.allocation.count(),
    prisma.allocation.count({ where: { status: 'ACTIVE' } }),
    prisma.allocation.count({ where: { status: 'RETURNED' } }),
    prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  return {
    allocations,
    metrics: {
      total: totalIssued,
      active: activeCount,
      returned: returnedCount,
      overdue: overdueCount,
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
 * Zero-Conflict Allocation Engine
 * Uses MySQL transactions and atomic check-and-update to prevent double allocation race conditions
 */
export const createAllocation = async ({
  assetId,
  recipientId,
  dueDate,
  issueCondition = 'GOOD',
  notes = null,
  overrideUnpaidFeeWarning = false,
  issuedById,
  ipAddress,
}) => {
  const parsedAssetId = Number(assetId);
  const parsedRecipientId = Number(recipientId);

  return await prisma.$transaction(async (tx) => {
    // 1. Validate Recipient exists
    const recipient = await tx.user.findUnique({
      where: { id: parsedRecipientId },
      include: {
        department: true,
        licenseFeeRecords: {
          take: 1,
          orderBy: { academicYear: 'desc' },
        },
      },
    });

    if (!recipient || !recipient.isActive) {
      throw new AppError('Selected recipient does not exist or account is inactive.', 400);
    }

    // 2. Rule: One Active Laptop Per Student/Faculty
    const existingActiveAllocation = await tx.allocation.findFirst({
      where: {
        recipientId: parsedRecipientId,
        status: 'ACTIVE',
      },
      include: {
        asset: { select: { assetTag: true, model: true } },
      },
    });

    if (existingActiveAllocation) {
      throw new AppError(
        `Allocation Conflict: ${recipient.name} (${recipient.rollNumberOrEmpId}) already has an active laptop issued (${existingActiveAllocation.asset.assetTag} - ${existingActiveAllocation.asset.model}). Return the current laptop before issuing another.`,
        409
      );
    }

    // 3. Check Software License Fee status for students
    if (recipient.role === 'STUDENT') {
      const latestFee = recipient.licenseFeeRecords[0];
      if (latestFee && latestFee.status === 'UNPAID' && !overrideUnpaidFeeWarning) {
        throw new AppError(
          `Fee Alert: Student ${recipient.name} has an UNPAID Software License Fee (${latestFee.amount} INR for ${latestFee.academicYear}). Allocation requires confirmation override.`,
          402,
          { requiresOverride: true, feeStatus: 'UNPAID', amount: latestFee.amount }
        );
      }
    }

    // 4. Concurrency Control: Atomic Check-and-Update Asset Status
    // Only an asset with status 'AVAILABLE' can be issued
    const updateResult = await tx.asset.updateMany({
      where: {
        id: parsedAssetId,
        status: 'AVAILABLE',
      },
      data: {
        status: 'ISSUED',
        condition: issueCondition,
      },
    });

    if (updateResult.count === 0) {
      // Find current asset state to provide precise diagnostic error
      const currentAsset = await tx.asset.findUnique({ where: { id: parsedAssetId } });
      if (!currentAsset) {
        throw new AppError('Asset does not exist.', 404);
      }
      throw new AppError(
        `Allocation Conflict Lock: Asset ${currentAsset.assetTag} is currently in '${currentAsset.status}' status and cannot be issued. A concurrent transaction may have already claimed this asset.`,
        409
      );
    }

    // 5. Create Allocation Record
    const allocation = await tx.allocation.create({
      data: {
        assetId: parsedAssetId,
        recipientId: parsedRecipientId,
        issuedById,
        issuedAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        issueCondition,
        status: 'ACTIVE',
        notes,
      },
      include: {
        asset: true,
        recipient: {
          select: { id: true, name: true, email: true, rollNumberOrEmpId: true, role: true },
        },
        issuedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // 6. Record Audit Trail
    await logAudit({
      actorId: issuedById,
      action: 'ALLOCATION_ISSUED',
      entityType: 'Allocation',
      entityId: allocation.id,
      details: {
        assetTag: allocation.asset.assetTag,
        serialNumber: allocation.asset.serialNumber,
        recipientRoll: recipient.rollNumberOrEmpId,
        recipientName: recipient.name,
        issueCondition,
      },
      ipAddress,
      tx,
    });

    return allocation;
  });
};

/**
 * Return Laptop & Update Immutable History Ledger
 */
export const returnAllocation = async ({
  allocationId,
  returnCondition,
  notes = null,
  fineAmount = 0,
  fineReason = null,
  finePaid = false,
  finePaymentMode = null,
  returnedById,
  ipAddress,
}) => {
  const parsedId = Number(allocationId);
  const parsedFineAmount = Number(fineAmount) || 0;
  const isFinePaid = Boolean(finePaid);

  return await prisma.$transaction(async (tx) => {
    const allocation = await tx.allocation.findUnique({
      where: { id: parsedId },
      include: { asset: true, recipient: true },
    });

    if (!allocation) {
      throw new AppError('Allocation record not found.', 404);
    }

    if (allocation.status === 'RETURNED') {
      throw new AppError('This asset has already been returned and marked complete.', 400);
    }

    // Determine post-return asset status: if damaged, send to UNDER_MAINTENANCE; otherwise AVAILABLE
    const nextStatus = returnCondition === 'DAMAGED' ? 'UNDER_MAINTENANCE' : 'AVAILABLE';

    // Update Asset
    await tx.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: nextStatus,
        condition: returnCondition,
      },
    });

    // Update Allocation Ledger with Return Information & Damage / Fine Charges
    const updatedAllocation = await tx.allocation.update({
      where: { id: parsedId },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
        returnedById,
        returnCondition,
        fineAmount: parsedFineAmount,
        fineReason: parsedFineAmount > 0 ? (fineReason || 'Laptop inspection damage charge') : null,
        finePaid: isFinePaid,
        finePaymentMode: parsedFineAmount > 0 ? (finePaymentMode || (isFinePaid ? 'CASH' : 'PENDING')) : null,
        notes: notes ? (allocation.notes ? `${allocation.notes}\n[Return Note]: ${notes}` : notes) : allocation.notes,
      },
      include: {
        asset: true,
        recipient: { select: { id: true, name: true, rollNumberOrEmpId: true } },
        issuedBy: { select: { id: true, name: true } },
        returnedBy: { select: { id: true, name: true } },
      },
    });

    // If a fine was charged or asset was damaged (e.g. damaged charger or body defect), log maintenance entry
    if (parsedFineAmount > 0 || returnCondition === 'DAMAGED') {
      const isChargerIssue = fineReason?.toLowerCase().includes('charger');
      const maintType = isChargerIssue
        ? 'OTHER'
        : (returnCondition === 'DAMAGED' ? 'SCREEN_REPAIR' : 'GENERAL_SERVICE');

      await tx.maintenanceLog.create({
        data: {
          assetId: allocation.assetId,
          performedById: returnedById,
          type: maintType,
          cost: parsedFineAmount,
          vendorOrTechnician: 'Return Inspection Desk',
          description: `Return Defect / Fine Record: ${fineReason || 'Physical defect reported on return'} (Charge: ₹${parsedFineAmount} - ${isFinePaid ? 'PAID via ' + (finePaymentMode || 'Cash') : 'UNPAID/PENDING'}) for student ${allocation.recipient.name} (${allocation.recipient.rollNumberOrEmpId})`,
          performedAt: new Date(),
        },
      });
    }

    // Audit Log
    await logAudit({
      actorId: returnedById,
      action: 'ASSET_RETURNED',
      entityType: 'Allocation',
      entityId: updatedAllocation.id,
      details: {
        assetTag: allocation.asset.assetTag,
        returnCondition,
        nextStatus,
        recipientName: allocation.recipient.name,
        fineAmount: parsedFineAmount,
        fineReason,
        finePaid: isFinePaid,
        finePaymentMode,
      },
      ipAddress,
      tx,
    });

    return updatedAllocation;
  });
};

/**
 * Fetch complete allocation record for printable receipt rendering.
 * 
 * @param {number|string} allocationId
 */
export const getAllocationReceiptData = async (allocationId) => {

  const allocation = await prisma.allocation.findUnique({
    where: { id: Number(allocationId) },
    include: {
      asset: {
        include: { department: true },
      },
      recipient: {
        include: { department: true },
      },
      issuedBy: true,
      returnedBy: true,
    },
  });

  if (!allocation) {
    throw new AppError('Allocation not found.', 404);
  }

  return allocation;
};

/**
 * Delete an allocation record from database.
 * If allocation is ACTIVE, resets the asset status back to AVAILABLE.
 */
export const deleteAllocation = async (allocationId, actorId, ipAddress) => {
  const parsedId = Number(allocationId);

  const allocation = await prisma.allocation.findUnique({
    where: { id: parsedId },
    include: { asset: true, recipient: true },
  });

  if (!allocation) {
    throw new AppError('Allocation record not found.', 404);
  }

  await prisma.$transaction(async (tx) => {
    // If allocation is active, reset asset status to AVAILABLE
    if (allocation.status === 'ACTIVE') {
      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: 'AVAILABLE' },
      });
    }

    await tx.allocation.delete({ where: { id: parsedId } });
  });

  await logAudit({
    actorId,
    action: 'ALLOCATION_DELETED',
    entityType: 'Allocation',
    entityId: String(parsedId),
    details: {
      assetTag: allocation.asset?.assetTag,
      recipientName: allocation.recipient?.name,
      status: allocation.status,
    },
    ipAddress,
  });

  return { message: 'Allocation record deleted successfully from database.' };
};

