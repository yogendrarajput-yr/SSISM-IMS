import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve master settings overview including departments, categories, and roles.
 */
export const getMasterSettingsOverview = async () => {
  const [departments, categories, donorsCount, usersCount, assetsCount] = await Promise.all([
    prisma.department.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, assets: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.donor.count(),
    prisma.user.count({ where: { isArchived: false } }),
    prisma.asset.count({ where: { isArchived: false } }),
  ]);

  const roles = [
    {
      role: 'SUPER_ADMIN',
      label: 'Super Admin (IT System Administrator)',
      description: 'Unrestricted system control, user provisioning, master settings, audit logs, and hardware destruction authority.',
      level: 1,
    },
    {
      role: 'HIGHER_MANAGEMENT',
      label: 'Higher Management (Dean / Director / Auditor)',
      description: 'Read-only governance, allocation ledger review, financial metrics, and tamper-resistant audit logs.',
      level: 2,
    },
    {
      role: 'STAFF',
      label: 'Staff (Inventory & Lab Technicians)',
      description: 'Daily operational management: issuing/returning laptops, logging maintenance, fee verification, and CSV imports.',
      level: 3,
    },
    {
      role: 'FACULTY',
      label: 'Faculty (Professors & Instructors)',
      description: 'Single institutional laptop custody for academic curriculum and research operations.',
      level: 4,
    },
    {
      role: 'STUDENT',
      label: 'Student',
      description: 'Single laptop custody subject to software license fee clearance and academic enrollment.',
      level: 5,
    },
  ];

  return {
    departments,
    categories,
    roles,
    counts: {
      departments: departments.length,
      categories: categories.length,
      donors: donorsCount,
      users: usersCount,
      assets: assetsCount,
    },
  };
};

/**
 * Create a new academic or administrative campus department.
 */
export const createDepartment = async ({ name, code }, actorId, ipAddress) => {
  if (!name || !code) {
    throw new AppError('Department name and code are required.', 400);
  }

  const existing = await prisma.department.findFirst({
    where: { OR: [{ code: code.trim() }, { name: name.trim() }] },
  });

  if (existing) {
    throw new AppError('A department with this name or code already exists.', 409);
  }

  const department = await prisma.department.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
    },
  });

  await logAudit({
    actorId,
    action: 'DEPARTMENT_CREATED',
    entityType: 'Department',
    entityId: String(department.id),
    details: { name: department.name, code: department.code },
    ipAddress,
  });

  return department;
};

/**
 * Update department name or code.
 */
export const updateDepartment = async (id, { name, code }, actorId, ipAddress) => {
  const dept = await prisma.department.findUnique({ where: { id: Number(id) } });
  if (!dept) throw new AppError('Department not found.', 404);

  const updated = await prisma.department.update({
    where: { id: Number(id) },
    data: {
      name: name ? name.trim() : dept.name,
      code: code ? code.trim().toUpperCase() : dept.code,
    },
  });

  await logAudit({
    actorId,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'Department',
    entityId: String(id),
    details: { before: dept, after: updated },
    ipAddress,
  });

  return updated;
};

/**
 * Delete department if no users or assets are currently assigned.
 */
export const deleteDepartment = async (id, actorId, ipAddress) => {
  const dept = await prisma.department.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { users: true, assets: true } } },
  });

  if (!dept) throw new AppError('Department not found.', 404);

  if (dept._count.users > 0 || dept._count.assets > 0) {
    throw new AppError(
      `Cannot delete department with ${dept._count.users} users and ${dept._count.assets} assets. Reassign them first.`,
      400
    );
  }

  await prisma.department.delete({ where: { id: Number(id) } });

  await logAudit({
    actorId,
    action: 'DEPARTMENT_DELETED',
    entityType: 'Department',
    entityId: String(id),
    details: { name: dept.name, code: dept.code },
    ipAddress,
  });

  return { message: `Department ${dept.code} deleted successfully.` };
};

/**
 * Create a new dynamic asset category for Phase 2 scaling.
 */
export const createCategory = async ({ name, code, description }, actorId, ipAddress) => {
  if (!name || !code) {
    throw new AppError('Category name and code are required.', 400);
  }

  const existing = await prisma.category.findFirst({
    where: { OR: [{ code: code.trim() }, { name: name.trim() }] },
  });

  if (existing) {
    throw new AppError('A category with this name or code already exists.', 409);
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : null,
    },
  });

  await logAudit({
    actorId,
    action: 'CATEGORY_CREATED',
    entityType: 'Category',
    entityId: String(category.id),
    details: { name: category.name, code: category.code },
    ipAddress,
  });

  return category;
};

/**
 * Update dynamic category.
 */
export const updateCategory = async (id, { name, code, description }, actorId, ipAddress) => {
  const cat = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!cat) throw new AppError('Category not found.', 404);

  const updated = await prisma.category.update({
    where: { id: Number(id) },
    data: {
      name: name ? name.trim() : cat.name,
      code: code ? code.trim().toUpperCase() : cat.code,
      description: description !== undefined ? description : cat.description,
    },
  });

  await logAudit({
    actorId,
    action: 'CATEGORY_UPDATED',
    entityType: 'Category',
    entityId: String(id),
    details: { before: cat, after: updated },
    ipAddress,
  });

  return updated;
};

/**
 * Delete dynamic category.
 */
export const deleteCategory = async (id, actorId, ipAddress) => {
  const cat = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!cat) throw new AppError('Category not found.', 404);

  await prisma.category.delete({ where: { id: Number(id) } });

  await logAudit({
    actorId,
    action: 'CATEGORY_DELETED',
    entityType: 'Category',
    entityId: String(id),
    details: { name: cat.name, code: cat.code },
    ipAddress,
  });

  return { message: `Category ${cat.name} deleted successfully.` };
};

/**
 * Soft-delete a campus department with Active Constraint Lock.
 * Strictly prevents archiving a department if active users or active assets belong to it.
 */
export const archiveDepartment = async (id, actorId, ipAddress) => {
  const dept = await prisma.department.findUnique({
    where: { id: Number(id) },
  });

  if (!dept) throw new AppError('Department not found.', 404);

  const activeUsers = await prisma.user.count({
    where: { departmentId: Number(id), isArchived: false },
  });
  const activeAssets = await prisma.asset.count({
    where: { departmentId: Number(id), isArchived: false },
  });

  if (activeUsers > 0 || activeAssets > 0) {
    throw new AppError(
      `Active Constraint Lock: Cannot archive department '${dept.code}' because it currently has ${activeUsers} active users and ${activeAssets} active assets. Reassign or archive them first.`,
      409
    );
  }

  const archived = await prisma.department.update({
    where: { id: Number(id) },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  await logAudit({
    actorId,
    action: 'DEPARTMENT_ARCHIVED',
    entityType: 'Department',
    entityId: String(id),
    details: { name: dept.name, code: dept.code },
    ipAddress,
  });

  return { message: `Department '${dept.code}' archived successfully.`, department: archived };
};

/**
 * Restore a soft-deleted department back to active status.
 */
export const restoreDepartment = async (id, actorId, ipAddress) => {
  const dept = await prisma.department.findUnique({ where: { id: Number(id) } });
  if (!dept) throw new AppError('Department not found.', 404);

  const restored = await prisma.department.update({
    where: { id: Number(id) },
    data: {
      isArchived: false,
      archivedAt: null,
    },
  });

  await logAudit({
    actorId,
    action: 'DEPARTMENT_RESTORED',
    entityType: 'Department',
    entityId: String(id),
    details: { name: dept.name, code: dept.code },
    ipAddress,
  });

  return { message: `Department '${dept.code}' restored successfully.`, department: restored };
};

/**
 * Super Admin Master Archive Viewer:
 * Returns all soft-deleted records across Laptops (Assets), Students, Staff & Faculty, and Departments.
 */
export const getArchivedRecords = async () => {
  const [archivedAssets, archivedStudents, archivedStaff, archivedDepartments] = await Promise.all([
    prisma.asset.findMany({
      where: { isArchived: true },
      orderBy: { archivedAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', isArchived: true },
      orderBy: { archivedAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { not: 'STUDENT' }, isArchived: true },
      orderBy: { archivedAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.department.findMany({
      where: { isArchived: true },
      orderBy: { archivedAt: 'desc' },
    }),
  ]);

  return {
    assets: archivedAssets,
    students: archivedStudents,
    staff: archivedStaff,
    departments: archivedDepartments,
    counts: {
      assets: archivedAssets.length,
      students: archivedStudents.length,
      staff: archivedStaff.length,
      departments: archivedDepartments.length,
      total:
        archivedAssets.length +
        archivedStudents.length +
        archivedStaff.length +
        archivedDepartments.length,
    },
  };
};
