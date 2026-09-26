import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';

/**
 * Retrieve paginated student directory with multi-column filtering,
 * laptop custody status, and fee clearance summary.
 */
export const getStudentsList = async ({
  page = 1,
  limit = 20,
  search = '',
  branch,
  batchYear,
  track,
  departmentId,
  custodyStatus,
  feeStatus,
  sortBy = 'name',
  sortOrder = 'asc',
}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    role: 'STUDENT',
    isArchived: false,
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { rollNumberOrEmpId: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { aadhaarNumber: { contains: q } },
      { fatherName: { contains: q } },
    ];
  }

  if (branch) where.branch = branch;
  if (batchYear) where.batchYear = batchYear;
  if (track) where.track = track;
  if (departmentId) where.departmentId = Number(departmentId);

  if (custodyStatus === 'ISSUED') {
    where.receivedAllocations = { some: { status: 'ACTIVE' } };
  } else if (custodyStatus === 'AVAILABLE') {
    where.receivedAllocations = { none: { status: 'ACTIVE' } };
  }

  if (feeStatus) {
    where.licenseFeeRecords = {
      some: {
        status: feeStatus,
      },
    };
  }

  const orderBy = {};
  if (['name', 'rollNumberOrEmpId', 'createdAt', 'batchYear'].includes(sortBy)) {
    orderBy[sortBy] = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy.name = 'asc';
  }

  const [
    students,
    total,
    holdingCount,
    feeClearedCount,
    feeOverdueCount,
    distinctBatches,
    distinctTracks,
  ] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      include: {
        department: { select: { id: true, name: true, code: true } },
        receivedAllocations: {
          where: { status: 'ACTIVE' },
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                serialNumber: true,
                make: true,
                model: true,
                condition: true,
                chargerSerial: true,
              },
            },
          },
        },
        licenseFeeRecords: {
          take: 1,
          orderBy: { academicYear: 'desc' },
          select: {
            id: true,
            academicYear: true,
            semester: true,
            amount: true,
            status: true,
            receiptNo: true,
            paymentDate: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        isArchived: false,
        receivedAllocations: { some: { status: 'ACTIVE' } },
      },
    }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        isArchived: false,
        licenseFeeRecords: { some: { status: 'PAID' } },
      },
    }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        isArchived: false,
        licenseFeeRecords: { some: { status: 'UNPAID' } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', isArchived: false, batchYear: { not: null } },
      select: { batchYear: true },
      distinct: ['batchYear'],
      orderBy: { batchYear: 'asc' },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', isArchived: false, track: { not: null } },
      select: { track: true },
      distinct: ['track'],
      orderBy: { track: 'asc' },
    }),
  ]);

  return {
    students,
    total,
    filters: {
      batches: distinctBatches.map((b) => b.batchYear).filter(Boolean),
      tracks: distinctTracks.map((t) => t.track).filter(Boolean),
    },
    metrics: {
      totalActiveStudents: await prisma.user.count({ where: { role: 'STUDENT', isArchived: false } }),
      holdingLaptop: holdingCount,
      feeCleared: feeClearedCount,
      feeOverdue: feeOverdueCount,
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

/**
 * Register a single new student into directory and automatically initialize fee ledger.
 */
export const createStudent = async (data, actorId, ipAddress) => {
  const {
    name,
    fatherName,
    branch,
    batchYear,
    track,
    phone,
    email,
    aadhaarNumber,
    rollNumber,
    address,
    departmentId,
    feeStatus = 'PAID',
    feeAmount = 1500,
  } = data;

  if (!name || !email || !rollNumber) {
    throw new AppError('Student Name, Email ID, and Roll Number are required.', 400);
  }

  // Check unique constraints
  const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existingEmail) throw new AppError(`Email '${email}' is already registered in the system.`, 409);

  const existingRoll = await prisma.user.findUnique({ where: { rollNumberOrEmpId: rollNumber.trim() } });
  if (existingRoll) throw new AppError(`Roll Number '${rollNumber}' is already registered.`, 409);

  if (aadhaarNumber && aadhaarNumber.trim()) {
    const existingAadhaar = await prisma.user.findUnique({ where: { aadhaarNumber: aadhaarNumber.trim() } });
    if (existingAadhaar) throw new AppError(`Aadhaar Number '${aadhaarNumber}' is already registered.`, 409);
  }

  // Find department if not explicitly given
  let resolvedDeptId = departmentId ? Number(departmentId) : null;
  if (!resolvedDeptId && branch) {
    const deptMatch = await prisma.department.findFirst({
      where: { OR: [{ code: branch.trim() }, { name: { contains: branch.trim() } }] },
    });
    if (deptMatch) resolvedDeptId = deptMatch.id;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Student@123', salt);

  const student = await prisma.user.create({
    data: {
      name: name.trim(),
      fatherName: fatherName ? fatherName.trim() : null,
      branch: branch ? branch.trim() : 'IT Excellence Group',
      batchYear: batchYear ? batchYear.trim() : '2024-2028',
      track: track ? track.trim() : 'General',
      phone: phone ? phone.trim() : null,
      email: email.trim().toLowerCase(),
      aadhaarNumber: aadhaarNumber && aadhaarNumber.trim() ? aadhaarNumber.trim() : null,
      rollNumberOrEmpId: rollNumber.trim(),
      address: address ? address.trim() : null,
      departmentId: resolvedDeptId,
      role: 'STUDENT',
      passwordHash,
      isArchived: false,
    },
    include: {
      department: true,
    },
  });

  // Automatically initialize license fee record
  await prisma.licenseFeeRecord.create({
    data: {
      studentId: student.id,
      academicYear: '2025-2026',
      semester: 'Semester 4',
      amount: Number(feeAmount) || 1500,
      status: feeStatus || 'PAID',
      paymentDate: feeStatus === 'PAID' ? new Date() : null,
      receiptNo: feeStatus === 'PAID' ? `REC-ST-${Math.floor(1000 + Math.random() * 9000)}` : null,
      notes: 'Initial registration fee record.',
    },
  });

  await logAudit({
    actorId,
    action: 'STUDENT_CREATED',
    entityType: 'User',
    entityId: String(student.id),
    details: { name: student.name, rollNumber: student.rollNumberOrEmpId, branch: student.branch },
    ipAddress,
  });

  return student;
};

/**
 * Bulk import students from spreadsheet rows.
 */
export const bulkImportStudents = async (rows, actorId, ipAddress) => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No student records provided for bulk import.', 400);
  }

  const departments = await prisma.department.findMany();
  const deptMap = {};
  departments.forEach((d) => {
    deptMap[d.code.toLowerCase()] = d.id;
    deptMap[d.name.toLowerCase()] = d.id;
  });

  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase())
  );
  const existingRolls = new Set(
    (await prisma.user.findMany({ select: { rollNumberOrEmpId: true } })).map((u) => u.rollNumberOrEmpId.toLowerCase())
  );
  const existingAadhaars = new Set(
    (await prisma.user.findMany({ where: { aadhaarNumber: { not: null } }, select: { aadhaarNumber: true } })).map(
      (u) => u.aadhaarNumber.toLowerCase()
    )
  );

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Student@123', salt);

  const batchEmails = new Set();
  const batchRolls = new Set();
  const batchAadhaars = new Set();
  const errors = [];
  let importedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const name = (row.name || row['Student Name'] || row['Name'] || '').trim();
    const roll = (row.rollNumber || row['Roll Number'] || row['RollNo'] || '').trim();
    const email = (row.email || row['Email ID'] || row['Email'] || '').trim().toLowerCase();
    const fatherName = (row.fatherName || row["Father's Name"] || row['Father Name'] || '').trim();
    const branch = (row.branch || row['Class/Branch'] || row['Branch'] || 'IT Excellence Group').trim();
    const batchYear = (row.batchYear || row['Year/Batch'] || row['Batch'] || '2024-2028').trim();
    const track = (row.track || row['Track'] || 'General').trim();
    const phone = (row.phone || row['Mobile Number'] || row['Mobile'] || '').trim();
    const aadhaar = (row.aadhaarNumber || row['Aadhaar Number'] || row['Aadhaar'] || '').trim();
    const address = (row.address || row['Address'] || '').trim();
    const feeStatus = (row.feeStatus || row['Fee Status'] || 'PAID').trim().toUpperCase();
    const feeAmount = Number(row.feeAmount || row['Fee Amount'] || 1500);

    if (!name || !roll || !email) {
      errors.push(`Row ${rowNum}: Student Name, Roll Number, and Email ID are mandatory.`);
      continue;
    }

    if (existingEmails.has(email) || batchEmails.has(email)) {
      errors.push(`Row ${rowNum}: Duplicate email '${email}' detected.`);
      continue;
    }

    if (existingRolls.has(roll.toLowerCase()) || batchRolls.has(roll.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate Roll Number '${roll}' detected.`);
      continue;
    }

    if (aadhaar && (existingAadhaars.has(aadhaar.toLowerCase()) || batchAadhaars.has(aadhaar.toLowerCase()))) {
      errors.push(`Row ${rowNum}: Duplicate Aadhaar '${aadhaar}' detected.`);
      continue;
    }

    batchEmails.add(email);
    batchRolls.add(roll.toLowerCase());
    if (aadhaar) batchAadhaars.add(aadhaar.toLowerCase());

    const deptId = deptMap[branch.toLowerCase()] || deptMap['iteg'] || departments[0]?.id || null;

    try {
      const student = await prisma.user.create({
        data: {
          name,
          fatherName: fatherName || null,
          branch,
          batchYear,
          track,
          phone: phone || null,
          email,
          aadhaarNumber: aadhaar || null,
          rollNumberOrEmpId: roll,
          address: address || null,
          role: 'STUDENT',
          departmentId: deptId,
          passwordHash: defaultPasswordHash,
          isArchived: false,
        },
      });

      await prisma.licenseFeeRecord.create({
        data: {
          studentId: student.id,
          academicYear: '2025-2026',
          semester: 'Semester 4',
          amount: feeAmount,
          status: ['PAID', 'UNPAID', 'PARTIAL', 'EXEMPTED'].includes(feeStatus) ? feeStatus : 'PAID',
          paymentDate: feeStatus === 'PAID' ? new Date() : null,
          receiptNo: feeStatus === 'PAID' ? `REC-BLK-${Math.floor(1000 + Math.random() * 9000)}` : null,
        },
      });

      existingEmails.add(email);
      existingRolls.add(roll.toLowerCase());
      if (aadhaar) existingAadhaars.add(aadhaar.toLowerCase());
      importedCount++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  await logAudit({
    actorId,
    action: 'BULK_STUDENT_IMPORT',
    entityType: 'User',
    entityId: `BULK-ST-${Date.now()}`,
    details: { totalRows: rows.length, importedCount, errorCount: errors.length },
    ipAddress,
  });

  return {
    success: true,
    importedCount,
    skippedCount: errors.length,
    errors: errors.slice(0, 10),
  };
};

/**
 * Generate official sample Excel template for bulk student import.
 */
export const generateStudentSampleTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  const worksheet = workbook.addWorksheet('Students_Template', {
    properties: { tabColor: { argb: 'F26522' } },
  });

  worksheet.columns = [
    { header: 'Student Name', key: 'name', width: 22 },
    { header: "Father's Name", key: 'fatherName', width: 22 },
    { header: 'Class/Branch', key: 'branch', width: 16 },
    { header: 'Year/Batch', key: 'batchYear', width: 16 },
    { header: 'Track', key: 'track', width: 22 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Email ID', key: 'email', width: 26 },
    { header: 'Aadhaar Number', key: 'aadhaarNumber', width: 20 },
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Fee Status', key: 'feeStatus', width: 14 },
    { header: 'Fee Amount', key: 'feeAmount', width: 14 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F26522' },
  };

  const sampleRows = [
    {
      name: 'Rohan Deshmukh',
      fatherName: 'Pravin Deshmukh',
      branch: 'IT Excellence Group',
      batchYear: '2024-2028',
      track: 'Full Stack Development',
      phone: '+91 98765 11001',
      email: 'st.rohan@ssism.edu',
      aadhaarNumber: '3456-7890-1001',
      rollNumber: '24ITEG045',
      address: 'Plot 45, Narmada Road, Sandalpur',
      feeStatus: 'PAID',
      feeAmount: '1500',
    },
    {
      name: 'Simran Chouhan',
      fatherName: 'Rajendra Chouhan',
      branch: 'Management Excellence Group',
      batchYear: '2024-2028',
      track: 'Robotics & Automation',
      phone: '+91 98765 11002',
      email: 'st.simran@ssism.edu',
      aadhaarNumber: '3456-7890-1002',
      rollNumber: '24MEG032',
      address: 'Main Bazar, Khategaon',
      feeStatus: 'UNPAID',
      feeAmount: '1500',
    },
  ];

  sampleRows.forEach((r) => worksheet.addRow(r));
  return workbook;
};

/**
 * Retrieve paginated staff and faculty directory with department and laptop custody.
 */
export const getStaffList = async ({
  page = 1,
  limit = 20,
  search = '',
  departmentId,
  designation,
  custodyStatus,
  sortBy = 'name',
  sortOrder = 'asc',
}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    role: { in: ['STAFF', 'FACULTY', 'HIGHER_MANAGEMENT', 'SUPER_ADMIN'] },
    isArchived: false,
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { rollNumberOrEmpId: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { aadhaarNumber: { contains: q } },
      { designation: { contains: q } },
    ];
  }

  if (departmentId) where.departmentId = Number(departmentId);
  if (designation) where.designation = { contains: designation };

  if (custodyStatus === 'ISSUED') {
    where.receivedAllocations = { some: { status: 'ACTIVE' } };
  } else if (custodyStatus === 'AVAILABLE') {
    where.receivedAllocations = { none: { status: 'ACTIVE' } };
  }

  const orderBy = {};
  if (['name', 'rollNumberOrEmpId', 'createdAt', 'designation'].includes(sortBy)) {
    orderBy[sortBy] = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy.name = 'asc';
  }

  const [staff, total, holdingCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
      include: {
        department: { select: { id: true, name: true, code: true } },
        receivedAllocations: {
          where: { status: 'ACTIVE' },
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                serialNumber: true,
                make: true,
                model: true,
                condition: true,
                chargerSerial: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        role: { in: ['STAFF', 'FACULTY', 'HIGHER_MANAGEMENT', 'SUPER_ADMIN'] },
        isArchived: false,
        receivedAllocations: { some: { status: 'ACTIVE' } },
      },
    }),
  ]);

  return {
    staff,
    total,
    metrics: {
      totalStaff: await prisma.user.count({
        where: {
          role: { in: ['STAFF', 'FACULTY', 'HIGHER_MANAGEMENT', 'SUPER_ADMIN'] },
          isArchived: false,
        },
      }),
      holdingLaptop: holdingCount,
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

/**
 * Register a single new staff member or faculty.
 */
export const createStaff = async (data, actorId, ipAddress) => {
  const {
    name,
    departmentId,
    designation,
    aadhaarNumber,
    phone,
    email,
    employeeId,
    role = 'STAFF',
    address,
  } = data;

  if (!name || !email || !employeeId) {
    throw new AppError('Staff Name, Email ID, and Employee ID are required.', 400);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existingEmail) throw new AppError(`Email '${email}' is already in use.`, 409);

  const existingEmp = await prisma.user.findUnique({ where: { rollNumberOrEmpId: employeeId.trim() } });
  if (existingEmp) throw new AppError(`Employee ID '${employeeId}' is already registered.`, 409);

  if (aadhaarNumber && aadhaarNumber.trim()) {
    const existingAadhaar = await prisma.user.findUnique({ where: { aadhaarNumber: aadhaarNumber.trim() } });
    if (existingAadhaar) throw new AppError(`Aadhaar Number '${aadhaarNumber}' is already registered.`, 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Staff@123', salt);

  const staff = await prisma.user.create({
    data: {
      name: name.trim(),
      departmentId: departmentId ? Number(departmentId) : null,
      designation: designation ? designation.trim() : 'Staff Member',
      aadhaarNumber: aadhaarNumber && aadhaarNumber.trim() ? aadhaarNumber.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email.trim().toLowerCase(),
      rollNumberOrEmpId: employeeId.trim(),
      role: ['FACULTY', 'HIGHER_MANAGEMENT', 'SUPER_ADMIN'].includes(role) ? role : 'STAFF',
      address: address ? address.trim() : null,
      passwordHash,
      isArchived: false,
    },
    include: {
      department: true,
    },
  });

  await logAudit({
    actorId,
    action: 'STAFF_CREATED',
    entityType: 'User',
    entityId: String(staff.id),
    details: { name: staff.name, empId: staff.rollNumberOrEmpId, designation: staff.designation },
    ipAddress,
  });

  return staff;
};

/**
 * Bulk import staff & faculty members from spreadsheet rows.
 */
export const bulkImportStaff = async (rows, actorId, ipAddress) => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No staff records provided for bulk import.', 400);
  }

  const departments = await prisma.department.findMany();
  const deptMap = {};
  departments.forEach((d) => {
    deptMap[d.code.toLowerCase()] = d.id;
    deptMap[d.name.toLowerCase()] = d.id;
  });

  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase())
  );
  const existingEmpIds = new Set(
    (await prisma.user.findMany({ select: { rollNumberOrEmpId: true } })).map((u) => u.rollNumberOrEmpId.toLowerCase())
  );
  const existingAadhaars = new Set(
    (await prisma.user.findMany({ where: { aadhaarNumber: { not: null } }, select: { aadhaarNumber: true } })).map(
      (u) => u.aadhaarNumber.toLowerCase()
    )
  );

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Staff@123', salt);

  const batchEmails = new Set();
  const batchEmpIds = new Set();
  const batchAadhaars = new Set();
  const errors = [];
  let importedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const name = (row.name || row['Staff Name'] || row['Name'] || '').trim();
    const empId = (row.employeeId || row['Employee ID'] || row['Emp ID'] || row['EmpId'] || '').trim();
    const email = (row.email || row['Email ID'] || row['Email'] || '').trim().toLowerCase();
    const departmentName = (row.department || row['Department'] || 'IT Excellence Group').trim();
    const designation = (row.designation || row['Current Role / Designation'] || row['Role'] || 'Staff').trim();
    const phone = (row.phone || row['Mobile Number'] || row['Mobile'] || '').trim();
    const aadhaar = (row.aadhaarNumber || row['Aadhaar Number'] || row['Aadhaar'] || '').trim();

    if (!name || !empId || !email) {
      errors.push(`Row ${rowNum}: Staff Name, Employee ID, and Email ID are mandatory.`);
      continue;
    }

    if (existingEmails.has(email) || batchEmails.has(email)) {
      errors.push(`Row ${rowNum}: Duplicate email '${email}' detected.`);
      continue;
    }

    if (existingEmpIds.has(empId.toLowerCase()) || batchEmpIds.has(empId.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate Employee ID '${empId}' detected.`);
      continue;
    }

    if (aadhaar && (existingAadhaars.has(aadhaar.toLowerCase()) || batchAadhaars.has(aadhaar.toLowerCase()))) {
      errors.push(`Row ${rowNum}: Duplicate Aadhaar '${aadhaar}' detected.`);
      continue;
    }

    batchEmails.add(email);
    batchEmpIds.add(empId.toLowerCase());
    if (aadhaar) batchAadhaars.add(aadhaar.toLowerCase());

    const deptId = deptMap[departmentName.toLowerCase()] || deptMap['it excellence group'] || deptMap['iteg'] || departments[0]?.id || null;

    // Detect if role should be FACULTY vs STAFF
    const isFaculty = designation.toLowerCase().includes('prof') || designation.toLowerCase().includes('faculty') || designation.toLowerCase().includes('hod');
    const role = isFaculty ? 'FACULTY' : 'STAFF';

    try {
      await prisma.user.create({
        data: {
          name,
          rollNumberOrEmpId: empId,
          email,
          departmentId: deptId,
          designation,
          phone: phone || null,
          aadhaarNumber: aadhaar || null,
          role,
          passwordHash: defaultPasswordHash,
          isArchived: false,
        },
      });

      existingEmails.add(email);
      existingEmpIds.add(empId.toLowerCase());
      if (aadhaar) existingAadhaars.add(aadhaar.toLowerCase());
      importedCount++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  await logAudit({
    actorId,
    action: 'BULK_STAFF_IMPORT',
    entityType: 'User',
    entityId: `BULK-STF-${Date.now()}`,
    details: { totalRows: rows.length, importedCount, errorCount: errors.length },
    ipAddress,
  });

  return {
    success: true,
    importedCount,
    skippedCount: errors.length,
    errors: errors.slice(0, 10),
  };
};

/**
 * Generate official sample Excel template for bulk staff import.
 */
export const generateStaffSampleTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  const worksheet = workbook.addWorksheet('Staff_Template', {
    properties: { tabColor: { argb: '3B82F6' } },
  });

  worksheet.columns = [
    { header: 'Staff Name', key: 'name', width: 22 },
    { header: 'Department', key: 'department', width: 16 },
    { header: 'Current Role / Designation', key: 'designation', width: 26 },
    { header: 'Aadhaar Number', key: 'aadhaarNumber', width: 20 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Email ID', key: 'email', width: 26 },
    { header: 'Employee ID', key: 'employeeId', width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' },
  };

  const sampleRows = [
    {
      name: 'Prof. Manish Joshi',
      department: 'IT Excellence Group',
      designation: 'Assistant Professor (Data Science)',
      aadhaarNumber: '9876-5432-3001',
      phone: '+91 98765 22001',
      email: 'faculty.manish@ssism.edu',
      employeeId: 'EMP-FAC-201',
    },
    {
      name: 'Ritu Sen',
      department: 'Bio Excellence Group',
      designation: 'Lab Instructor & System Tech',
      aadhaarNumber: '9876-5432-3002',
      phone: '+91 98765 22002',
      email: 'staff.ritu@ssism.edu',
      employeeId: 'EMP-STF-025',
    },
  ];

  sampleRows.forEach((r) => worksheet.addRow(r));
  return workbook;
};

/**
 * Retrieve comprehensive details for a single student or staff member
 * for the slide-over details drawer.
 */
export const getUserDetails = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      department: true,
      receivedAllocations: {
        orderBy: { issuedAt: 'desc' },
        include: {
          asset: true,
          issuedBy: { select: { id: true, name: true, rollNumberOrEmpId: true } },
          returnedBy: { select: { id: true, name: true, rollNumberOrEmpId: true } },
        },
      },
      licenseFeeRecords: {
        orderBy: { academicYear: 'desc' },
      },
    },
  });

  if (!user) throw new AppError('User record not found.', 404);

  const activeAllocation = user.receivedAllocations.find((a) => a.status === 'ACTIVE') || null;

  return {
    ...user,
    activeAllocation,
  };
};

/**
 * Update student or staff member profile details.
 */
export const updateUser = async (id, data, actorId, ipAddress) => {
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) throw new AppError('User not found.', 404);

  // Check unique constraints if fields changed
  if (data.email && data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (existingEmail) throw new AppError(`Email '${data.email}' is already taken.`, 409);
  }

  if (data.rollNumberOrEmpId && data.rollNumberOrEmpId.trim() !== user.rollNumberOrEmpId) {
    const existingRoll = await prisma.user.findUnique({ where: { rollNumberOrEmpId: data.rollNumberOrEmpId.trim() } });
    if (existingRoll) throw new AppError(`Roll Number / Emp ID '${data.rollNumberOrEmpId}' is already taken.`, 409);
  }

  if (data.aadhaarNumber && data.aadhaarNumber.trim() !== (user.aadhaarNumber || '')) {
    const existingAadhaar = await prisma.user.findUnique({ where: { aadhaarNumber: data.aadhaarNumber.trim() } });
    if (existingAadhaar) throw new AppError(`Aadhaar Number '${data.aadhaarNumber}' is already in use.`, 409);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.fatherName !== undefined) updateData.fatherName = data.fatherName ? data.fatherName.trim() : null;
  if (data.branch !== undefined) updateData.branch = data.branch ? data.branch.trim() : null;
  if (data.batchYear !== undefined) updateData.batchYear = data.batchYear ? data.batchYear.trim() : null;
  if (data.track !== undefined) updateData.track = data.track ? data.track.trim() : null;
  if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
  if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
  if (data.aadhaarNumber !== undefined) updateData.aadhaarNumber = data.aadhaarNumber ? data.aadhaarNumber.trim() : null;
  if (data.rollNumberOrEmpId !== undefined) updateData.rollNumberOrEmpId = data.rollNumberOrEmpId.trim();
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
  if (data.designation !== undefined) updateData.designation = data.designation ? data.designation.trim() : null;
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId ? Number(data.departmentId) : null;
  if (data.role !== undefined) updateData.role = data.role;

  const updated = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData,
    include: { department: true },
  });

  await logAudit({
    actorId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: String(id),
    details: { changes: updateData },
    ipAddress,
  });

  return updated;
};

/**
 * Universal Soft-Delete Archive for Users with ACTIVE CONSTRAINT LOCK:
 * Strictly prevents archiving any student or staff member who currently holds
 * an 'ISSUED' active laptop until the asset is returned.
 */
export const archiveUser = async (id, actorId, ipAddress) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      receivedAllocations: {
        where: { status: 'ACTIVE' },
        include: { asset: true },
      },
    },
  });

  if (!user) throw new AppError('User not found.', 404);

  // ACTIVE CONSTRAINT LOCK ENFORCEMENT
  if (user.receivedAllocations && user.receivedAllocations.length > 0) {
    const activeAlloc = user.receivedAllocations[0];
    throw new AppError(
      `Active Constraint Lock: Cannot archive user '${user.name}' (${user.rollNumberOrEmpId}) because they currently hold an active issued laptop '${activeAlloc.asset.assetTag}' (${activeAlloc.asset.model}). Please complete the laptop return before archiving this user.`,
      409
    );
  }

  const archived = await prisma.user.update({
    where: { id: Number(id) },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      isActive: false,
    },
  });

  await logAudit({
    actorId,
    action: 'USER_ARCHIVED',
    entityType: 'User',
    entityId: String(id),
    details: { name: user.name, rollNumberOrEmpId: user.rollNumberOrEmpId, role: user.role },
    ipAddress,
  });

  return { message: `User '${user.name}' has been archived successfully.`, archived };
};

/**
 * Restore a soft-deleted user back to active status.
 */
export const restoreUser = async (id, actorId, ipAddress) => {
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user) throw new AppError('User not found.', 404);

  const restored = await prisma.user.update({
    where: { id: Number(id) },
    data: {
      isArchived: false,
      archivedAt: null,
      isActive: true,
    },
  });

  await logAudit({
    actorId,
    action: 'USER_RESTORED',
    entityType: 'User',
    entityId: String(id),
    details: { name: user.name, rollNumberOrEmpId: user.rollNumberOrEmpId },
    ipAddress,
  });

  return { message: `User '${user.name}' restored successfully.`, restored };
};

/**
 * Bulk archive multiple users with Active Constraint Lock.
 */
export const bulkArchiveUsers = async (ids, actorId, ipAddress) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError('No user IDs specified for bulk archiving.', 400);
  }

  const numericIds = ids.map((id) => Number(id)).filter((n) => !isNaN(n) && n > 0);

  // Check for active laptop allocations across any of the users
  const activeAllocations = await prisma.allocation.findMany({
    where: {
      recipientId: { in: numericIds },
      status: 'ACTIVE',
    },
    include: {
      recipient: { select: { id: true, name: true, rollNumberOrEmpId: true } },
      asset: { select: { assetTag: true, model: true } },
    },
  });

  if (activeAllocations.length > 0) {
    const lockedNames = activeAllocations
      .map((a) => `'${a.recipient.name}' (${a.recipient.rollNumberOrEmpId} holding ${a.asset.assetTag})`)
      .join(', ');
    throw new AppError(
      `Active Constraint Lock: Bulk archive aborted. The following user(s) currently hold active issued laptops: ${lockedNames}. Return the assets first.`,
      409
    );
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: numericIds } },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      isActive: false,
    },
  });

  await logAudit({
    actorId,
    action: 'BULK_USER_ARCHIVE',
    entityType: 'User',
    entityId: `BULK-ARCHIVE-${Date.now()}`,
    details: { count: result.count, userIds: numericIds },
    ipAddress,
  });

  return { success: true, archivedCount: result.count };
};

/**
 * Export students or staff to Excel workbook.
 */
export const exportUsersToExcel = async (role = 'STUDENT', filters = {}) => {
  const isStudent = role === 'STUDENT';
  const where = {
    isArchived: false,
    role: isStudent ? 'STUDENT' : { in: ['STAFF', 'FACULTY', 'HIGHER_MANAGEMENT', 'SUPER_ADMIN'] },
  };

  if (filters.departmentId) where.departmentId = Number(filters.departmentId);
  if (filters.branch) where.branch = filters.branch;
  if (filters.batchYear) where.batchYear = filters.batchYear;

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      department: true,
      receivedAllocations: {
        where: { status: 'ACTIVE' },
        include: { asset: true },
      },
      licenseFeeRecords: {
        take: 1,
        orderBy: { academicYear: 'desc' },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  const sheetName = isStudent ? 'Students_Directory' : 'Staff_Directory';
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: isStudent ? '059669' : '1E3A8A' } },
  });

  if (isStudent) {
    worksheet.columns = [
      { header: 'Roll Number', key: 'roll', width: 16 },
      { header: 'Student Name', key: 'name', width: 22 },
      { header: "Father's Name", key: 'father', width: 20 },
      { header: 'Class/Branch', key: 'branch', width: 14 },
      { header: 'Year/Batch', key: 'batch', width: 14 },
      { header: 'Track', key: 'track', width: 22 },
      { header: 'Mobile Number', key: 'phone', width: 18 },
      { header: 'Email ID', key: 'email', width: 26 },
      { header: 'Aadhaar Number', key: 'aadhaar', width: 20 },
      { header: 'Issued Laptop', key: 'laptop', width: 24 },
      { header: 'Fee Status', key: 'feeStatus', width: 14 },
      { header: 'Address', key: 'address', width: 28 },
    ];
  } else {
    worksheet.columns = [
      { header: 'Employee ID', key: 'roll', width: 16 },
      { header: 'Staff Name', key: 'name', width: 22 },
      { header: 'Department', key: 'department', width: 16 },
      { header: 'Designation', key: 'designation', width: 26 },
      { header: 'Role Tier', key: 'role', width: 16 },
      { header: 'Mobile Number', key: 'phone', width: 18 },
      { header: 'Email ID', key: 'email', width: 26 },
      { header: 'Aadhaar Number', key: 'aadhaar', width: 20 },
      { header: 'Issued Laptop', key: 'laptop', width: 24 },
      { header: 'Address', key: 'address', width: 28 },
    ];
  }

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isStudent ? '059669' : '1E3A8A' },
  };

  users.forEach((u) => {
    const activeAlloc = u.receivedAllocations[0];
    const laptopText = activeAlloc ? `${activeAlloc.asset.assetTag} (${activeAlloc.asset.model})` : 'None';

    if (isStudent) {
      const fee = u.licenseFeeRecords[0];
      worksheet.addRow({
        roll: u.rollNumberOrEmpId,
        name: u.name,
        father: u.fatherName || 'N/A',
        branch: u.branch || u.department?.code || 'N/A',
        batch: u.batchYear || 'N/A',
        track: u.track || 'General',
        phone: u.phone || 'N/A',
        email: u.email,
        aadhaar: u.aadhaarNumber || 'N/A',
        laptop: laptopText,
        feeStatus: fee ? fee.status : 'UNPAID',
        address: u.address || 'N/A',
      });
    } else {
      worksheet.addRow({
        roll: u.rollNumberOrEmpId,
        name: u.name,
        department: u.department?.code || 'General',
        designation: u.designation || 'Staff',
        role: u.role,
        phone: u.phone || 'N/A',
        email: u.email,
        aadhaar: u.aadhaarNumber || 'N/A',
        laptop: laptopText,
        address: u.address || 'N/A',
      });
    }
  });

  return workbook;
};

/**
 * Permanently delete a user from the database.
 * Enforces safety guards:
 * - Rejects if user currently holds an active issued laptop.
 * - Rejects self-deletion.
 * - Rejects if deleting the last remaining Super Admin.
 * - In a transaction, cleans up relational constraints and purges the user.
 */
export const deleteUser = async (id, actorId, ipAddress) => {
  const userId = Number(id);
  if (actorId === userId) {
    throw new AppError('Security constraint: You cannot delete your own account.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      receivedAllocations: {
        where: { status: 'ACTIVE' },
        include: { asset: true },
      },
    },
  });

  if (!user) throw new AppError('User not found.', 404);

  if (user.receivedAllocations && user.receivedAllocations.length > 0) {
    const activeAlloc = user.receivedAllocations[0];
    throw new AppError(
      `Cannot delete user '${user.name}' (${user.rollNumberOrEmpId}) because they currently hold active laptop '${activeAlloc.asset.assetTag}'. Please process laptop return first.`,
      400
    );
  }

  if (user.role === 'SUPER_ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (adminCount <= 1) {
      throw new AppError('Cannot delete the last remaining Super Admin in the system.', 400);
    }
  }

  // Execute relational cleanup and delete in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete license fee records
    await tx.licenseFeeRecord.deleteMany({ where: { studentId: userId } });

    // 2. Delete recipient allocations (only returned/inactive remain)
    await tx.allocation.deleteMany({ where: { recipientId: userId } });

    // 3. Reassign or clear staff/admin foreign keys
    await tx.allocation.updateMany({
      where: { issuedById: userId },
      data: { issuedById: actorId },
    });
    await tx.allocation.updateMany({
      where: { returnedById: userId },
      data: { returnedById: null },
    });
    await tx.maintenanceLog.updateMany({
      where: { performedById: userId },
      data: { performedById: null },
    });
    await tx.auditLog.updateMany({
      where: { actorId: userId },
      data: { actorId: null },
    });

    // 4. Delete user record
    await tx.user.delete({ where: { id: userId } });
  });

  await logAudit({
    actorId,
    action: 'USER_DELETED',
    entityType: 'User',
    entityId: String(userId),
    details: { name: user.name, rollNumberOrEmpId: user.rollNumberOrEmpId, role: user.role },
    ipAddress,
  });

  return { message: `User '${user.name}' has been permanently deleted from the database.` };
};

/**
 * Bulk permanently delete multiple users from database.
 */
export const bulkDeleteUsers = async (ids, actorId, ipAddress) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('A list of valid user IDs is required for bulk deletion.', 400);
  }

  const numericIds = ids.map(Number).filter((id) => id !== actorId);
  const deleted = [];
  const errors = [];

  for (const id of numericIds) {
    try {
      await deleteUser(id, actorId, ipAddress);
      deleted.push(id);
    } catch (err) {
      errors.push({ id, reason: err.message });
    }
  }

  return {
    message: `Bulk deletion processed. Successfully deleted ${deleted.length} user(s).`,
    deletedCount: deleted.length,
    failedCount: errors.length,
    errors,
  };
};

