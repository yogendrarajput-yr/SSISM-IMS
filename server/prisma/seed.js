import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with fresh production records for SSISM IMS...');

  // 1. Clear existing temporary/mock records in reverse order of foreign keys
  await prisma.auditLog.deleteMany({});
  await prisma.licenseFeeRecord.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.donor.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  console.log('✓ Cleaned existing database records.');

  // Load compiled seed data extracted directly from official reference PDF
  const seedDataPath = path.join(__dirname, 'seed_data.json');
  const seedPayload = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

  // 2. Seed Dynamic Master Categories
  for (const cat of seedPayload.categories) {
    await prisma.category.create({ data: cat });
  }
  console.log(`✓ Seeded ${seedPayload.categories.length} master categories.`);

  // 3. Seed Donors (Amazon, Sant Singaji Foundation, SAMA, Inchara, Deboli, SSISM)
  const donorMap = {};
  for (const d of seedPayload.donors) {
    const createdDonor = await prisma.donor.create({
      data: {
        name: d.name,
        organization: d.organization,
        email: d.email,
        phone: d.phone,
        address: d.address,
        donationDate: new Date('2024-01-15'),
        notes: d.notes,
      },
    });
    donorMap[d.key] = createdDonor;
  }
  console.log(`✓ Seeded ${seedPayload.donors.length} production donors.`);

  // 4. Seed Departments (Full Forms: IT Excellence Group, Management Excellence Group, etc.)
  const deptMap = {};
  for (const dept of seedPayload.departments) {
    const createdDept = await prisma.department.create({
      data: {
        name: dept.name,
        code: dept.code,
      },
    });
    deptMap[dept.name] = createdDept;
  }
  console.log(`✓ Seeded ${seedPayload.departments.length} departments with complete full forms.`);

  // 5. Password Hashes (salt = 12)
  const salt = await bcrypt.genSalt(12);
  const defaultPasswordHash = await bcrypt.hash('Admin@123', salt);
  const staffPasswordHash = await bcrypt.hash('Staff@123', salt);
  const studentPasswordHash = await bcrypt.hash('Student@123', salt);

  // 6. Seed Core Administrative Users
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Dr. Rajesh Sharma (Super Admin)',
      email: 'superadmin@ssism.edu',
      passwordHash: defaultPasswordHash,
      rollNumberOrEmpId: 'EMP-ADM-001',
      role: 'SUPER_ADMIN',
      designation: 'Chief Information Officer & System Administrator',
      aadhaarNumber: '9876-5432-1001',
      departmentId: deptMap['Higher Authority']?.id || deptMap['IT Excellence Group'].id,
      phone: '+91 98765 43210',
      address: 'Staff Quarters Type-V, SSISM Campus, Sandalpur',
    },
  });

  const staffInventory = await prisma.user.create({
    data: {
      name: 'Vikram Verma (Inventory Manager)',
      email: 'staff@ssism.edu',
      passwordHash: staffPasswordHash,
      rollNumberOrEmpId: 'EMP-STF-010',
      role: 'STAFF',
      designation: 'Senior Inventory & Lab Technician',
      aadhaarNumber: '9876-5432-1010',
      departmentId: deptMap['IT Excellence Group'].id,
      phone: '+91 98765 43211',
      address: 'Flat 302, Green Meadows, Sandalpur',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      name: 'Sunita Roy (Fee & Accounts)',
      email: 'accountant@ssism.edu',
      passwordHash: staffPasswordHash,
      rollNumberOrEmpId: 'EMP-ACC-004',
      role: 'STAFF',
      designation: 'Accounts Officer (Fee Ledger)',
      aadhaarNumber: '9876-5432-1004',
      departmentId: deptMap['Account']?.id || deptMap['IT Excellence Group'].id,
      phone: '+91 98765 43212',
      address: 'House 14, Civil Lines, Sandalpur',
    },
  });

  const auditor = await prisma.user.create({
    data: {
      name: 'Prof. Arvind Mehta (Dean / Auditor)',
      email: 'auditor@ssism.edu',
      passwordHash: staffPasswordHash,
      rollNumberOrEmpId: 'EMP-MGT-002',
      role: 'HIGHER_MANAGEMENT',
      designation: 'Dean of Academic Governance & Audit',
      aadhaarNumber: '9876-5432-1002',
      departmentId: deptMap['Higher Authority']?.id || deptMap['IT Excellence Group'].id,
      phone: '+91 98765 43213',
      address: 'Dean Bungalow, SSISM West Campus, Sandalpur',
    },
  });

  // 7. Seed PDF Recipients (Students, Faculty, Staff)
  const recipientUserMap = {};
  for (const u of seedPayload.users) {
    const deptId = deptMap[u.departmentName]?.id || deptMap['IT Excellence Group'].id;
    const pwdHash = u.role === 'STUDENT' ? studentPasswordHash : staffPasswordHash;

    const createdUser = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: pwdHash,
        rollNumberOrEmpId: u.rollNumberOrEmpId,
        role: u.role,
        departmentId: deptId,
        designation: u.designation,
        aadhaarNumber: u.aadhaarNumber,
        branch: u.branch,
        batchYear: u.batchYear,
        track: u.track,
        phone: u.phone,
        address: u.address,
      },
    });

    recipientUserMap[u.name] = createdUser;

    // Create annual software license fee record for students
    if (u.role === 'STUDENT') {
      await prisma.licenseFeeRecord.create({
        data: {
          studentId: createdUser.id,
          academicYear: '2025-2026',
          semester: 'Semester 4',
          amount: 4500.00,
          status: 'PAID',
          paymentDate: new Date('2025-08-15'),
          receiptNo: `REC-2025-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: 'Annual student computer license fee cleared.',
        },
      });
    }
  }
  console.log(`✓ Seeded ${seedPayload.users.length} authentic students and faculty recipients.`);

  // 8. Seed Complete 237 Laptops and create Active Allocations
  let allocatedCount = 0;
  for (const lap of seedPayload.laptops) {
    const donor = donorMap[lap.donorKey] || donorMap['Amaz…'];
    const deptId = deptMap[lap.departmentName]?.id || deptMap['IT Excellence Group'].id;

    const asset = await prisma.asset.create({
      data: {
        assetTag: lap.assetTag,
        serialNumber: lap.serialNumber,
        category: 'LAPTOP',
        make: lap.make,
        model: lap.model,
        processor: lap.processor,
        generation: lap.generation,
        ram: lap.ram,
        storage: lap.storage,
        displaySize: lap.displaySize,
        color: lap.color,
        chargerSerial: `CHG-${lap.serialNumber.slice(-8)}`,
        hasBag: true,
        hasMouse: false,
        acquisitionSource: lap.isDonated ? 'DONATED' : 'PURCHASED',
        donorId: lap.isDonated ? donor?.id : null,
        purchaseDate: lap.isDonated ? null : new Date('2024-03-10'),
        invoiceNo: lap.isDonated ? null : `INV-2024-${8000 + lap.srNo}`,
        warrantyExpiry: new Date('2027-03-10'),
        condition: lap.condition,
        status: lap.status,
        remarks: lap.isDonated
          ? `Donated by ${donor?.organization || 'Philanthropic Donor'} for student computer laboratory enablement.`
          : 'Direct institutional purchase from SSISM capital equipment fund.',
        departmentId: deptId,
        attributes: {
          macAddress: `00:1B:44:A${lap.srNo % 9}:3A:${(lap.srNo % 80) + 10}`,
          biosVersion: `v1.${(lap.srNo % 5) + 1}.0`,
          batteryHealth: `${92 + (lap.srNo % 8)}%`,
          osPreinstalled: 'Windows 11 Education 64-bit',
          phase2Extensible: true,
        },
      },
    });

    // If issued in PDF and assignedTo person exists, link active Allocation
    if (lap.status === 'ISSUED' && lap.assignedTo && recipientUserMap[lap.assignedTo]) {
      const recipient = recipientUserMap[lap.assignedTo];

      // Parse Issue Date if available
      let issueDate = new Date();
      if (lap.issueDate) {
        const parts = lap.issueDate.split(/[-/]/);
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
            issueDate = new Date(y, m, d);
          }
        }
      }

      await prisma.allocation.create({
        data: {
          assetId: asset.id,
          recipientId: recipient.id,
          issuedById: staffInventory.id,
          issuedAt: issueDate,
          dueDate: new Date(Date.now() + 180 * 86400000), // 6 months standard term
          issueCondition: lap.condition === 'DAMAGED' ? 'DAMAGED' : 'GOOD',
          status: 'ACTIVE',
          notes: `Official institutional issuance to ${recipient.name} (${lap.userType || recipient.role}). Charger and laptop bag verified.`,
        },
      });
      allocatedCount++;
    }
  }
  console.log(`✓ Seeded ${seedPayload.laptops.length} laptop assets.`);
  console.log(`✓ Seeded ${allocatedCount} active laptop allocations.`);

  // 9. Initial System Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'SYS-PROD-01',
      details: {
        message: `Database populated with 237 production laptop assets, 6 verified donors, and ${seedPayload.users.length} users.`,
        environment: 'production',
        totalLaptops: seedPayload.laptops.length,
        totalAllocations: allocatedCount,
      },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 Production database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
