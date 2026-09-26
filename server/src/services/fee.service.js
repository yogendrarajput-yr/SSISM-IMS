import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve paginated student software license fee records with summary analytics.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.status]
 * @param {number} [params.departmentId]
 * @param {string} [params.academicYear]
 * @param {string} [params.search='']
 */
export const getFeeRecordsList = async ({
  page = 1,
  limit = 20,
  status,
  departmentId,
  academicYear,
  search = '',
}) => {

  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (status) where.status = status;
  if (academicYear) where.academicYear = academicYear;
  if (departmentId) {
    where.student = { departmentId: Number(departmentId) };
  }
  if (search) {
    where.student = {
      ...where.student,
      OR: [
        { name: { contains: search } },
        { rollNumberOrEmpId: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  const [records, total, summary] = await Promise.all([
    prisma.licenseFeeRecord.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { id: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumberOrEmpId: true,
            batchYear: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
    prisma.licenseFeeRecord.count({ where }),
    prisma.licenseFeeRecord.groupBy({
      by: ['status'],
      where: departmentId ? { student: { departmentId: Number(departmentId) } } : {},
      _count: { status: true },
      _sum: { amount: true },
    }),
  ]);

  return {
    records,
    summary,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Update software license fee payment status, receipt number, and payment date.
 * 
 * @param {number|string} id - License fee record ID
 * @param {Object} data - Update payload
 * @param {number} actorId - ID of user updating the fee
 * @param {string} ipAddress - Client IP address
 */
export const updateFeeRecord = async (id, data, actorId, ipAddress) => {
  const existing = await prisma.licenseFeeRecord.findUnique({
    where: { id: Number(id) },
    include: { student: true },
  });

  if (!existing) {
    throw new AppError('Fee record not found.', 404);
  }

  const updated = await prisma.licenseFeeRecord.update({
    where: { id: Number(id) },
    data: {
      status: data.status,
      amount: data.amount !== undefined ? data.amount : undefined,
      receiptNo: data.receiptNo !== undefined ? data.receiptNo : undefined,
      paymentDate: data.status === 'PAID' && !data.paymentDate ? new Date() : (data.paymentDate ? new Date(data.paymentDate) : undefined),
      notes: data.notes !== undefined ? data.notes : undefined,
    },
    include: {
      student: {
        select: { id: true, name: true, rollNumberOrEmpId: true, email: true },
      },
    },
  });

  await logAudit({
    actorId,
    action: 'FEE_STATUS_UPDATED',
    entityType: 'LicenseFeeRecord',
    entityId: updated.id,
    details: {
      studentRoll: existing.student.rollNumberOrEmpId,
      oldStatus: existing.status,
      newStatus: data.status,
      receiptNo: data.receiptNo,
    },
    ipAddress,
  });

  return updated;
};

/**
 * Check whether a student has an outstanding unpaid license fee record.
 * 
 * @param {number|string} studentId - Student user ID
 */
export const checkStudentFeeStatus = async (studentId) => {
  const feeRecord = await prisma.licenseFeeRecord.findFirst({
    where: { studentId: Number(studentId) },
    orderBy: { academicYear: 'desc' },
  });

  return {
    hasRecord: !!feeRecord,
    feeRecord,
    isUnpaid: feeRecord ? feeRecord.status === 'UNPAID' : false,
  };
};

/**
 * Delete a software license fee record from the database.
 */
export const deleteFeeRecord = async (id, actorId, ipAddress) => {
  const parsedId = Number(id);
  const existing = await prisma.licenseFeeRecord.findUnique({
    where: { id: parsedId },
    include: { student: true },
  });

  if (!existing) {
    throw new AppError('Fee record not found.', 404);
  }

  await prisma.licenseFeeRecord.delete({ where: { id: parsedId } });

  await logAudit({
    actorId,
    action: 'FEE_RECORD_DELETED',
    entityType: 'LicenseFeeRecord',
    entityId: String(parsedId),
    details: {
      studentRoll: existing.student?.rollNumberOrEmpId,
      studentName: existing.student?.name,
      academicYear: existing.academicYear,
      amount: existing.amount,
      status: existing.status,
    },
    ipAddress,
  });

  return { message: 'Fee record deleted successfully from database.' };
};


