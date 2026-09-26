import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';

/**
 * Retrieve paginated donor list with search, asset count, and acquisition analytics.
 * 
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=15]
 * @param {string} [params.search='']
 */
export const getDonorsList = async ({ page = 1, limit = 15, search = '' }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { organization: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const [donors, total, totalDonatedLaptops, totalPurchasedLaptops] = await Promise.all([
    prisma.donor.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    }),
    prisma.donor.count({ where }),
    prisma.asset.count({ where: { acquisitionSource: 'DONATED' } }),
    prisma.asset.count({ where: { acquisitionSource: 'PURCHASED' } }),
  ]);

  return {
    donors,
    stats: {
      totalDonors: total,
      totalDonatedLaptops,
      totalPurchasedLaptops,
      totalLaptops: totalDonatedLaptops + totalPurchasedLaptops,
      donationRatio:
        totalDonatedLaptops + totalPurchasedLaptops > 0
          ? Math.round((totalDonatedLaptops / (totalDonatedLaptops + totalPurchasedLaptops)) * 100)
          : 0,
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
 * Retrieve donor detail by ID with complete list of donated assets and custody timeline.
 * 
 * @param {number} donorId
 */
export const getDonorById = async (donorId) => {
  const donor = await prisma.donor.findUnique({
    where: { id: Number(donorId) },
    include: {
      assets: {
        orderBy: { id: 'desc' },
        include: {
          department: { select: { id: true, code: true, name: true } },
          allocations: {
            where: { status: 'ACTIVE' },
            include: {
              recipient: { select: { id: true, name: true, rollNumberOrEmpId: true, role: true } },
            },
          },
        },
      },
    },
  });

  if (!donor) {
    throw new AppError('Donor record not found.', 404);
  }

  return donor;
};

/**
 * Register a new corporate or individual donor in the master registry.
 * 
 * @param {Object} data
 * @param {number} actorId
 * @param {string} ipAddress
 */
export const createDonor = async (data, actorId, ipAddress) => {
  const { name, organization, email, phone, address, donationDate, notes } = data;

  if (!name) {
    throw new AppError('Donor contact representative name is required.', 400);
  }

  const donor = await prisma.donor.create({
    data: {
      name,
      organization: organization || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      donationDate: donationDate ? new Date(donationDate) : new Date(),
      notes: notes || null,
    },
  });

  await logAudit({
    actorId,
    action: 'DONOR_CREATED',
    entityType: 'Donor',
    entityId: String(donor.id),
    details: { name: donor.name, organization: donor.organization },
    ipAddress,
  });

  return donor;
};

/**
 * Update existing donor details.
 * 
 * @param {number} donorId
 * @param {Object} data
 * @param {number} actorId
 * @param {string} ipAddress
 */
export const updateDonor = async (donorId, data, actorId, ipAddress) => {
  const existing = await prisma.donor.findUnique({ where: { id: Number(donorId) } });
  if (!existing) {
    throw new AppError('Donor record not found.', 404);
  }

  const updated = await prisma.donor.update({
    where: { id: Number(donorId) },
    data: {
      name: data.name !== undefined ? data.name : existing.name,
      organization: data.organization !== undefined ? data.organization : existing.organization,
      email: data.email !== undefined ? data.email : existing.email,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      address: data.address !== undefined ? data.address : existing.address,
      donationDate: data.donationDate ? new Date(data.donationDate) : existing.donationDate,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
  });

  await logAudit({
    actorId,
    action: 'DONOR_UPDATED',
    entityType: 'Donor',
    entityId: String(donorId),
    details: { changes: data },
    ipAddress,
  });

  return updated;
};

/**
 * Delete donor record if no active dependencies exist, or unlink assets safely.
 * 
 * @param {number} donorId
 * @param {number} actorId
 * @param {string} ipAddress
 */
export const deleteDonor = async (donorId, actorId, ipAddress) => {
  const donor = await prisma.donor.findUnique({
    where: { id: Number(donorId) },
    include: { _count: { select: { assets: true } } },
  });

  if (!donor) {
    throw new AppError('Donor record not found.', 404);
  }

  if (donor._count.assets > 0) {
    throw new AppError(
      `Cannot delete donor with ${donor._count.assets} linked assets. Please reassign or unlink assets first.`,
      400
    );
  }

  await prisma.donor.delete({ where: { id: Number(donorId) } });

  await logAudit({
    actorId,
    action: 'DONOR_DELETED',
    entityType: 'Donor',
    entityId: String(donorId),
    details: { name: donor.name, organization: donor.organization },
    ipAddress,
  });

  return { message: 'Donor removed successfully.' };
};
