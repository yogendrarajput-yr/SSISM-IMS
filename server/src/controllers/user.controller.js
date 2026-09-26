import * as userService from '../services/user.service.js';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

/**
 * Helper to parse either CSV or Excel file uploaded in multipart form-data.
 */
const parseUploadedFile = async (file) => {
  const rows = [];
  if (!file) return rows;
  const filename = file.originalname ? file.originalname.toLowerCase() : '';

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];
    if (worksheet) {
      const headers = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value ? String(cell.value).trim() : `col_${colNumber}`;
          });
        } else {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              rowData[header] = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
            }
          });
          if (Object.keys(rowData).length > 0) rows.push(rowData);
        }
      });
    }
  } else {
    const stream = Readable.from(file.buffer.toString('utf-8'));
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
  }
  return rows;
};

/**
 * GET /api/users/students
 * Fetch paginated student directory with search and academic filters.
 */
export const getStudents = async (req, res, next) => {
  try {
    const result = await userService.getStudentsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/students
 * Register a single new student.
 */
export const createStudent = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const student = await userService.createStudent(req.body, req.user.id, ipAddress);
    res.status(201).json({ success: true, data: { student }, message: 'Student registered successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/students/bulk-import
 * Bulk import students via uploaded Excel/CSV file or JSON payload.
 */
export const bulkImportStudents = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let rows = [];

    if (req.file) {
      rows = await parseUploadedFile(req.file);
    } else if (req.body && req.body.rows) {
      rows = req.body.rows;
    }

    const result = await userService.bulkImportStudents(rows, req.user.id, ipAddress);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/students/template
 * Download sample Excel workbook for bulk student import.
 */
export const downloadStudentTemplate = async (req, res, next) => {
  try {
    const workbook = await userService.generateStudentSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Student_Import_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/staff
 * Fetch paginated staff & faculty directory.
 */
export const getStaff = async (req, res, next) => {
  try {
    const result = await userService.getStaffList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff
 * Register a single new staff member or faculty.
 */
export const createStaff = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const staff = await userService.createStaff(req.body, req.user.id, ipAddress);
    res.status(201).json({ success: true, data: { staff }, message: 'Staff member registered successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff/bulk-import
 * Bulk import staff & faculty via Excel/CSV file or JSON payload.
 */
export const bulkImportStaff = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let rows = [];

    if (req.file) {
      rows = await parseUploadedFile(req.file);
    } else if (req.body && req.body.rows) {
      rows = req.body.rows;
    }

    const result = await userService.bulkImportStaff(rows, req.user.id, ipAddress);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/staff/template
 * Download sample Excel workbook for bulk staff import.
 */
export const downloadStaffTemplate = async (req, res, next) => {
  try {
    const workbook = await userService.generateStaffSampleTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Staff_Import_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Fetch comprehensive user details for slide-over drawer.
 */
export const getUserDetails = async (req, res, next) => {
  try {
    const user = await userService.getUserDetails(req.params.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Update student or staff member profile.
 */
export const updateUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const updated = await userService.updateUser(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: { user: updated }, message: 'User updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/archive
 * Soft-delete user with Active Constraint Lock enforcement.
 */
export const archiveUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await userService.archiveUser(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/restore
 * Restore soft-deleted user.
 */
export const restoreUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await userService.restoreUser(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/bulk-archive
 * Bulk archive multiple users with Active Constraint Lock enforcement.
 */
export const bulkArchiveUsers = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await userService.bulkArchiveUsers(req.body.ids, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: `Archived ${result.archivedCount} users successfully.` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/export
 * Export students or staff to Excel workbook.
 */
export const exportUsers = async (req, res, next) => {
  try {
    const { role = 'STUDENT' } = req.query;
    const workbook = await userService.exportUsersToExcel(role, req.query);
    const filename = role === 'STUDENT' ? 'SSISM_Students_Directory.xlsx' : 'SSISM_Staff_Directory.xlsx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Permanently delete a single user from the database.
 */
export const deleteUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await userService.deleteUser(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/bulk-delete
 * Bulk permanently delete multiple users from the database.
 */
export const bulkDeleteUsers = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await userService.bulkDeleteUsers(req.body.ids, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

