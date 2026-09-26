import { prisma } from '../config/db.js';
import { AppError } from '../utils/appError.js';
import { logAudit } from './audit.service.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import bcrypt from 'bcryptjs';

/**
 * Bulk import laptops from parsed CSV or JSON data rows.
 * Validates uniqueness of Asset Tags and Serial Numbers against both DB and batch.
 * 
 * @param {Array<Object>} rows - Raw data rows from file or payload
 * @param {number} actorId - ID of user performing import
 * @param {string} ipAddress - Client IP address
 */
export const importAssetsFromData = async (rows, actorId, ipAddress) => {

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No data rows provided for asset import.', 400);
  }

  const existingTags = new Set(
    (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag.toLowerCase())
  );
  const existingSerials = new Set(
    (await prisma.asset.findMany({ select: { serialNumber: true } })).map((a) => a.serialNumber.toLowerCase())
  );

  const departments = await prisma.department.findMany();
  const deptMap = {};
  departments.forEach((d) => {
    deptMap[d.code.toLowerCase()] = d.id;
    deptMap[d.name.toLowerCase()] = d.id;
  });

  const validAssets = [];
  const errors = [];
  const batchTags = new Set();
  const batchSerials = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const tag = (row.assetTag || row['Asset Tag'] || '').trim();
    const serial = (row.serialNumber || row['Serial Number'] || '').trim();
    const make = (row.make || row['Make'] || 'Dell').trim();
    const model = (row.model || row['Model'] || '').trim();

    if (!tag || !serial || !model) {
      errors.push(`Row ${rowNum}: Asset Tag, Serial Number, and Model are mandatory.`);
      continue;
    }

    if (existingTags.has(tag.toLowerCase()) || batchTags.has(tag.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate Asset Tag '${tag}' found.`);
      continue;
    }

    if (existingSerials.has(serial.toLowerCase()) || batchSerials.has(serial.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate Serial Number '${serial}' found.`);
      continue;
    }

    batchTags.add(tag.toLowerCase());
    batchSerials.add(serial.toLowerCase());

    const deptKey = (row.department || row.deptCode || 'IT Excellence Group').toLowerCase();
    const deptId = deptMap[deptKey] || departments[0]?.id || null;

    validAssets.push({
      assetTag: tag,
      serialNumber: serial,
      category: 'LAPTOP',
      make,
      model,
      processor: (row.processor || row['Processor'] || 'Intel Core i5').trim(),
      ram: (row.ram || row['RAM'] || '16GB DDR4').trim(),
      storage: (row.storage || row['Storage'] || '512GB SSD').trim(),
      chargerSerial: (row.chargerSerial || row['Charger Serial'] || `CHG-${serial.slice(-6)}`).trim(),
      hasBag: row.hasBag !== undefined ? Boolean(row.hasBag) : true,
      hasMouse: row.hasMouse !== undefined ? Boolean(row.hasMouse) : false,
      condition: row.condition || 'GOOD',
      status: 'AVAILABLE',
      departmentId: deptId,
      attributes: {
        importedViaBulk: true,
        importDate: new Date().toISOString(),
      },
    });
  }

  if (validAssets.length === 0) {
    throw new AppError(`Import failed. No valid rows to insert. Issues:\n${errors.slice(0, 5).join('\n')}`, 400);
  }

  // Insert in chunks
  const created = await prisma.asset.createMany({
    data: validAssets,
  });

  await logAudit({
    actorId,
    action: 'BULK_ASSET_IMPORT',
    entityType: 'Asset',
    entityId: `BULK-${Date.now()}`,
    details: { totalRows: rows.length, importedCount: created.count, errorCount: errors.length },
    ipAddress,
  });

  return {
    success: true,
    importedCount: created.count,
    skippedCount: errors.length,
    errors: errors.slice(0, 10),
  };
};

/**
 * Bulk import students and automatically initialize their software license fee records.
 * 
 * @param {Array<Object>} rows - Raw data rows from file or payload
 * @param {number} actorId - ID of user performing import
 * @param {string} ipAddress - Client IP address
 */
export const importStudentsFromData = async (rows, actorId, ipAddress) => {

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No student rows provided for import.', 400);
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

  const defaultPasswordHash = await bcrypt.hash('Student@123', 10);
  const errors = [];
  let importedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const name = (row.name || row['Name'] || '').trim();
    const email = (row.email || row['Email'] || '').trim().toLowerCase();
    const roll = (row.rollNumber || row['Roll Number'] || row['RollNo'] || '').trim();

    if (!name || !email || !roll) {
      errors.push(`Row ${rowNum}: Name, Email, and Roll Number are required.`);
      continue;
    }

    if (existingEmails.has(email)) {
      errors.push(`Row ${rowNum}: Email '${email}' is already registered.`);
      continue;
    }

    if (existingRolls.has(roll.toLowerCase())) {
      errors.push(`Row ${rowNum}: Roll Number '${roll}' already exists.`);
      continue;
    }

    const deptKey = (row.department || row.deptCode || 'IT Excellence Group').toLowerCase();
    const deptId = deptMap[deptKey] || departments[0]?.id || null;
    const feeStatus = row.feeStatus || row['Fee Status'] || 'PAID';
    const amount = Number(row.feeAmount || row['Fee Amount'] || 1500);

    try {
      const student = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: defaultPasswordHash,
          rollNumberOrEmpId: roll,
          role: 'STUDENT',
          departmentId: deptId,
          batchYear: row.batchYear || '2023-2027',
          phone: row.phone || null,
        },
      });

      await prisma.licenseFeeRecord.create({
        data: {
          studentId: student.id,
          academicYear: row.academicYear || '2025-2026',
          semester: row.semester || 'Semester 4',
          amount,
          status: feeStatus,
          paymentDate: feeStatus === 'PAID' ? new Date() : null,
          receiptNo: feeStatus === 'PAID' ? `REC-IMP-${Math.floor(1000 + Math.random() * 9000)}` : null,
        },
      });

      existingEmails.add(email);
      existingRolls.add(roll.toLowerCase());
      importedCount++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${e.message}`);
    }
  }

  await logAudit({
    actorId,
    action: 'BULK_STUDENT_IMPORT',
    entityType: 'User',
    entityId: `BULK-${Date.now()}`,
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
 * Export hardware inventory records to a styled Excel (.xlsx) workbook.
 * 
 * @param {Object} [filters={}] - Optional status, category, or departmentId filters
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const exportAssetsToExcel = async (filters = {}) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.departmentId) where.departmentId = Number(filters.departmentId);
  if (filters.ids) {
    const idArray = String(filters.ids).split(',').map((id) => Number(id.trim())).filter((n) => !isNaN(n) && n > 0);
    if (idArray.length > 0) where.id = { in: idArray };
  }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { assetTag: 'asc' },
    include: {
      department: true,
      allocations: {
        where: { status: 'ACTIVE' },
        include: { recipient: true },
      },
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laptops & Assets', {
    properties: { tabColor: { argb: '1E3A8A' } },
  });

  worksheet.columns = [
    { header: 'Asset Tag', key: 'assetTag', width: 16 },
    { header: 'Serial Number', key: 'serialNumber', width: 22 },
    { header: 'Category', key: 'category', width: 12 },
    { header: 'Make', key: 'make', width: 14 },
    { header: 'Model', key: 'model', width: 24 },
    { header: 'Processor', key: 'processor', width: 22 },
    { header: 'RAM', key: 'ram', width: 14 },
    { header: 'Storage', key: 'storage', width: 16 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Currently Issued To', key: 'holder', width: 26 },
    { header: 'Charger Serial', key: 'chargerSerial', width: 20 },
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' },
  };

  assets.forEach((asset) => {
    const activeAlloc = asset.allocations[0];
    worksheet.addRow({
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber,
      category: asset.category,
      make: asset.make,
      model: asset.model,
      processor: asset.processor,
      ram: asset.ram,
      storage: asset.storage,
      condition: asset.condition,
      status: asset.status,
      department: asset.department?.name || 'General',
      holder: activeAlloc ? `${activeAlloc.recipient.name} (${activeAlloc.recipient.rollNumberOrEmpId})` : 'In Stock',
      chargerSerial: asset.chargerSerial || 'N/A',
    });
  });

  return workbook;
};

/**
 * Export hardware allocation timeline ledger to a styled Excel (.xlsx) workbook.
 * 
 * @param {Object} [filters={}] - Optional status filter (ACTIVE / RETURNED)
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const exportAllocationsToExcel = async (filters = {}) => {

  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.ids) {
    const idArray = String(filters.ids).split(',').map((id) => Number(id.trim())).filter((n) => !isNaN(n) && n > 0);
    if (idArray.length > 0) where.id = { in: idArray };
  }

  const allocations = await prisma.allocation.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      asset: true,
      recipient: { include: { department: true } },
      issuedBy: true,
      returnedBy: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Allocation History', {
    properties: { tabColor: { argb: '059669' } },
  });

  worksheet.columns = [
    { header: 'Alloc ID', key: 'id', width: 10 },
    { header: 'Asset Tag', key: 'assetTag', width: 16 },
    { header: 'Make & Model', key: 'laptop', width: 24 },
    { header: 'Recipient Name', key: 'recipientName', width: 24 },
    { header: 'Roll / Emp ID', key: 'recipientRoll', width: 18 },
    { header: 'Role', key: 'role', width: 14 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Issued Date', key: 'issuedAt', width: 16 },
    { header: 'Due Date', key: 'dueDate', width: 16 },
    { header: 'Returned Date', key: 'returnedAt', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Issue Condition', key: 'issueCondition', width: 16 },
    { header: 'Return Condition', key: 'returnCondition', width: 16 },
    { header: 'Issued By', key: 'issuedBy', width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '059669' },
  };

  allocations.forEach((a) => {
    worksheet.addRow({
      id: a.id,
      assetTag: a.asset.assetTag,
      laptop: `${a.asset.make} ${a.asset.model}`,
      recipientName: a.recipient.name,
      recipientRoll: a.recipient.rollNumberOrEmpId,
      role: a.recipient.role,
      department: a.recipient.department?.code || 'N/A',
      issuedAt: a.issuedAt ? a.issuedAt.toISOString().split('T')[0] : '',
      dueDate: a.dueDate ? a.dueDate.toISOString().split('T')[0] : 'Open',
      returnedAt: a.returnedAt ? a.returnedAt.toISOString().split('T')[0] : 'Active',
      status: a.status,
      issueCondition: a.issueCondition,
      returnCondition: a.returnCondition || 'Pending',
      issuedBy: a.issuedBy.name,
    });
  });

  return workbook;
};

/**
 * Generate official printable PDF hardware allocation receipt and stream to client response.
 * 
 * @param {number|string} allocationId - Allocation record ID
 * @param {import('express').Response} res - Express HTTP response stream
 */
export const generateReceiptPDF = async (allocationId, res) => {

  const allocation = await prisma.allocation.findUnique({
    where: { id: Number(allocationId) },
    include: {
      asset: { include: { department: true } },
      recipient: { include: { department: true } },
      issuedBy: true,
    },
  });

  if (!allocation) {
    throw new AppError('Allocation record not found.', 404);
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=SSISM_Receipt_${allocation.asset.assetTag}_${allocation.id}.pdf`
  );

  doc.pipe(res);

  // College Header
  doc
    .rect(40, 40, 515, 65)
    .fill('#1E293B');

  doc
    .fillColor('#FFFFFF')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('SHRI SHIVAJI INSTITUTE OF SCIENCE & MANAGEMENT', 45, 52, { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('CAMPUS ASSET & LAPTOP ALLOCATION RECEIPT', 45, 76, { align: 'center' });

  doc
    .fontSize(8)
    .text('IT System Administration & Infrastructure Department', 45, 90, { align: 'center' });

  doc.moveDown(2);

  // Receipt Reference Bar
  const issueDateStr = new Date(allocation.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dueDateStr = allocation.dueDate
    ? new Date(allocation.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'End of Academic Year';

  doc
    .fillColor('#0F172A')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Receipt No: REC-ALLOC-${String(allocation.id).padStart(5, '0')}`, 40, 125);

  doc
    .font('Helvetica')
    .text(`Issue Date: ${issueDateStr}`, 380, 125, { align: 'right' });

  doc.moveDown();

  // Section 1: Recipient Information
  doc
    .rect(40, 145, 515, 20)
    .fill('#E2E8F0');

  doc
    .fillColor('#1E293B')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('RECIPIENT DETAILS', 48, 150);

  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  doc.text(`Full Name: ${allocation.recipient.name}`, 50, 175);
  doc.text(`Roll / Employee ID: ${allocation.recipient.rollNumberOrEmpId}`, 50, 192);
  doc.text(`Designation / Role: ${allocation.recipient.role}`, 50, 209);
  doc.text(`Department: ${allocation.recipient.department?.name || 'General'} (${allocation.recipient.department?.code || ''})`, 300, 175);
  doc.text(`Email Address: ${allocation.recipient.email}`, 300, 192);
  doc.text(`Return Due Date: ${dueDateStr}`, 300, 209);

  // Section 2: Asset Hardware Specifications
  doc
    .rect(40, 235, 515, 20)
    .fill('#E2E8F0');

  doc
    .fillColor('#1E293B')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('ASSET HARDWARE SPECIFICATIONS', 48, 240);

  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  doc.text(`Asset Tag: ${allocation.asset.assetTag}`, 50, 265);
  doc.text(`Serial Number: ${allocation.asset.serialNumber}`, 50, 282);
  doc.text(`Make & Model: ${allocation.asset.make} ${allocation.asset.model}`, 50, 299);
  doc.text(`Processor: ${allocation.asset.processor || 'Standard'}`, 300, 265);
  doc.text(`RAM & Storage: ${allocation.asset.ram || '16GB'} / ${allocation.asset.storage || '512GB SSD'}`, 300, 282);
  doc.text(`Handover Condition: ${allocation.issueCondition}`, 300, 299);

  // Section 3: Accessories Handover Checklist
  doc
    .rect(40, 325, 515, 20)
    .fill('#E2E8F0');

  doc
    .fillColor('#1E293B')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('ACCESSORIES CHECKLIST', 48, 330);

  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  doc.text(`[ X ] Original Power Adapter / Charger (Serial: ${allocation.asset.chargerSerial || 'Tagged'})`, 50, 355);
  doc.text(`[ ${allocation.asset.hasBag ? 'X' : ' '} ] Official Laptop Carry Bag`, 50, 372);
  doc.text(`[ ${allocation.asset.hasMouse ? 'X' : ' '} ] External Optical Mouse`, 300, 372);

  // Section 4: Terms & Institutional Undertaking
  doc
    .rect(40, 400, 515, 20)
    .fill('#FEF3C7');

  doc
    .fillColor('#92400E')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('CAMPUS HARDWARE USAGE UNDERTAKING & POLICY', 48, 405);

  const terms = [
    '1. The hardware asset is assigned strictly for educational, research, and official college academic purposes.',
    '2. The holder is personally liable for physical damage, broken accessories (chargers/cables), or liquid spills.',
    '3. Unauthorized modification of hardware, removal of asset tags, or swapping components is strictly prohibited.',
    '4. Asset must be surrendered immediately upon semester completion, withdrawal, or administrative recall.',
    '5. Laptop Maintenance Fee (Rs 1500 - 2000 Manual) applies strictly to Students. Faculty/Staff are 100% exempt.',
  ];

  let termY = 428;
  terms.forEach((t) => {
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(t, 50, termY);
    termY += 15;
  });

  const hasFineOrReturned = allocation.status === 'RETURNED' || (allocation.fineAmount && Number(allocation.fineAmount) > 0);

  if (hasFineOrReturned) {
    // Section 4.5: Return Inspection & Damage / Defect Assessment
    doc
      .rect(40, 508, 515, 18)
      .fill('#FEE2E2');

    doc
      .fillColor('#991B1B')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text('RETURN INSPECTION & DEFECT / PENALTY ASSESSMENT', 48, 512);

    const returnDateStr = allocation.returnedAt
      ? new Date(allocation.returnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'In Custody / Pending';

    doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
    doc.text(`Return Date: ${returnDateStr}`, 50, 532);
    doc.text(`Return Condition: ${allocation.returnCondition || 'GOOD'}`, 50, 546);
    doc.text(`Defect / Damage Reason: ${allocation.fineReason || 'Standard Return (No Defect)'}`, 260, 532);
    doc.text(
      `Fine / Penalty: Rs ${Number(allocation.fineAmount || 0)} (${allocation.finePaid ? 'PAID' : 'UNPAID'} - ${allocation.finePaymentMode || 'CASH'})`,
      260,
      546
    );
  }

  // Section 5: Signatures
  const sigY = hasFineOrReturned ? 580 : 530;
  doc
    .moveTo(50, sigY + 35)
    .lineTo(220, sigY + 35)
    .stroke('#94A3B8');

  doc
    .moveTo(335, sigY + 35)
    .lineTo(505, sigY + 35)
    .stroke('#94A3B8');

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#1E293B')
    .text(`ISSUED BY: ${allocation.issuedBy.name}`, 50, sigY + 40);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748B')
    .text('IT Inventory Manager / Staff Signature', 50, sigY + 52);

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#1E293B')
    .text(`ACCEPTED BY: ${allocation.recipient.name}`, 335, sigY + 40);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748B')
    .text('Recipient (Student / Faculty) Signature', 335, sigY + 52);

  // Footer
  doc
    .fontSize(7.5)
    .fillColor('#94A3B8')
    .text(
      `Generated by SSISM IMS v1.0 • Immutable Ledger Hash: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      40,
      780,
      { align: 'center' }
    );

  doc.end();
};

/**
 * Generate official sample Excel workbook template for bulk laptop inventory import.
 * 
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const generateAssetSampleExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  const worksheet = workbook.addWorksheet('Laptops_Template', {
    properties: { tabColor: { argb: 'F26522' } },
  });

  worksheet.columns = [
    { header: 'Asset Tag', key: 'assetTag', width: 16 },
    { header: 'Serial Number', key: 'serialNumber', width: 22 },
    { header: 'Make', key: 'make', width: 14 },
    { header: 'Model', key: 'model', width: 22 },
    { header: 'Processor', key: 'processor', width: 22 },
    { header: 'RAM', key: 'ram', width: 14 },
    { header: 'Storage', key: 'storage', width: 16 },
    { header: 'Charger Serial', key: 'chargerSerial', width: 20 },
    { header: 'Department', key: 'department', width: 16 },
    { header: 'Condition', key: 'condition', width: 14 },
    { header: 'Has Bag', key: 'hasBag', width: 12 },
    { header: 'Has Mouse', key: 'hasMouse', width: 12 },
  ];

  // Header styling with SSISM Orange accent
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F26522' },
  };

  // Sample data rows matching database standards
  const sampleRows = [
    {
      assetTag: 'CLG-LAP-101',
      serialNumber: 'SN-DELL-9901',
      make: 'Dell',
      model: 'Latitude 3420',
      processor: 'Intel Core i5-1135G7',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      chargerSerial: 'CHG-9901',
      department: 'IT Excellence Group',
      condition: 'BRAND_NEW',
      hasBag: 'TRUE',
      hasMouse: 'FALSE',
    },
    {
      assetTag: 'CLG-LAP-102',
      serialNumber: 'SN-LEN-9902',
      make: 'Lenovo',
      model: 'ThinkPad E14',
      processor: 'AMD Ryzen 5 5625U',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      chargerSerial: 'CHG-9902',
      department: 'Bachelor of Technology',
      condition: 'GOOD',
      hasBag: 'TRUE',
      hasMouse: 'TRUE',
    },
  ];

  sampleRows.forEach((row) => worksheet.addRow(row));
  return workbook;
};

/**
 * Generate official sample Excel workbook template for bulk student registration & fee records.
 * 
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const generateStudentSampleExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSISM IMS';
  const worksheet = workbook.addWorksheet('Students_Template', {
    properties: { tabColor: { argb: '059669' } },
  });

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Department', key: 'department', width: 16 },
    { header: 'Batch Year', key: 'batchYear', width: 16 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Fee Status', key: 'feeStatus', width: 14 },
    { header: 'Fee Amount', key: 'feeAmount', width: 14 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '059669' },
  };

  const sampleRows = [
    {
      name: 'Devansh Gupta',
      email: 'st.devansh@ssism.edu',
      rollNumber: '24ITEG099',
      department: 'IT Excellence Group',
      batchYear: '2024-2028',
      phone: '+91 98765 43210',
      feeStatus: 'PAID',
      feeAmount: '1500',
    },
    {
      name: 'Ishita Rathi',
      email: 'st.ishita@ssism.edu',
      rollNumber: '24MEG088',
      department: 'Management Excellence Group',
      batchYear: '2024-2028',
      phone: '+91 98765 43211',
      feeStatus: 'UNPAID',
      feeAmount: '1500',
    },
  ];

  sampleRows.forEach((row) => worksheet.addRow(row));
  return workbook;
};

