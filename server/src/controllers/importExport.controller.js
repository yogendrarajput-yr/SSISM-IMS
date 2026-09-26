import * as importExportService from '../services/importExport.service.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

/**
 * Controller: Bulk import laptops via CSV file or JSON array.
 */
export const importAssets = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let rows = [];

    if (req.file) {
      // Parse uploaded CSV file from memory buffer
      const stream = Readable.from(req.file.buffer.toString('utf-8'));
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (req.body && req.body.rows) {
      rows = req.body.rows;
    }

    const result = await importExportService.importAssetsFromData(rows, req.user.id, ipAddress);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Bulk import students with auto-generated fee records via CSV file or JSON array.
 */
export const importStudents = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let rows = [];

    if (req.file) {
      const stream = Readable.from(req.file.buffer.toString('utf-8'));
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (req.body && req.body.rows) {
      rows = req.body.rows;
    }

    const result = await importExportService.importStudentsFromData(rows, req.user.id, ipAddress);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Export entire inventory or filtered subset to formatted Excel (.xlsx).
 */
export const exportAssets = async (req, res, next) => {
  try {
    const workbook = await importExportService.exportAssetsToExcel(req.query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Laptops_Inventory.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Export complete allocation timeline ledger to formatted Excel (.xlsx).
 */
export const exportAllocations = async (req, res, next) => {
  try {
    const workbook = await importExportService.exportAllocationsToExcel(req.query);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Allocation_Ledger.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Generate and stream official institutional PDF receipt.
 */
export const downloadReceipt = async (req, res, next) => {
  try {
    await importExportService.generateReceiptPDF(req.params.allocationId, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Download sample Excel template for bulk laptop inventory import.
 */
export const downloadAssetSampleTemplate = async (req, res, next) => {
  try {
    const workbook = await importExportService.generateAssetSampleExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Laptops_Sample_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Download sample Excel template for bulk student registration.
 */
export const downloadStudentSampleTemplate = async (req, res, next) => {
  try {
    const workbook = await importExportService.generateStudentSampleExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=SSISM_Students_Sample_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};


