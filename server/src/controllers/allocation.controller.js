import * as allocationService from '../services/allocation.service.js';
import {
  sendLaptopIssuedEmail,
  sendLaptopReturnedEmail,
  formatAllocationDuration,
} from '../utils/emailService.js';

/**
 * Controller: Get paginated list of hardware allocations.
 */
export const getAllocations = async (req, res, next) => {
  try {
    const result = await allocationService.getAllocationsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create and issue a new hardware allocation to a recipient.
 * Enforces Zero-Conflict concurrency checks and Software License Fee verification.
 * Dispatches official email notification to both Students and Faculty.
 */
export const createAllocation = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const allocation = await allocationService.createAllocation({
      ...req.body,
      issuedById: req.user.id,
      ipAddress,
    });

    const recipient = allocation.recipient;
    const userRole = recipient?.role || 'STUDENT';
    const asset = allocation.asset;

    // Send email notification to all recipients (Students, Faculty, Staff)
    if (recipient?.email) {
      sendLaptopIssuedEmail({
        to: recipient.email,
        userName: recipient.name,
        rollNumber: recipient.rollNumberOrEmpId,
        employeeId: recipient.rollNumberOrEmpId,
        userRole,
        courseBranch: recipient.branch || recipient.department?.name || recipient.track,
        semesterYear: recipient.batchYear ? `Batch ${recipient.batchYear}` : recipient.section,
        department: recipient.department?.name || recipient.branch || (userRole === 'STUDENT' ? 'Student Body' : 'SSISM Faculty'),
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        condition: allocation.issueCondition || asset.condition,
        chargerSerial: asset.chargerSerial,
        accessories: allocation.accessories,
        issuedBy: allocation.issuedBy?.name,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
        expectedReturnDate: (allocation.expectedReturnDate || allocation.dueDate)
          ? new Date(allocation.expectedReturnDate || allocation.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : undefined,
        dueDate: (allocation.expectedReturnDate || allocation.dueDate)
          ? new Date(allocation.expectedReturnDate || allocation.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : undefined,
        notes: allocation.notes,
      }).catch((err) => {
        console.error("Failed to send issue email to:", recipient.email, err.message);
      });
    } else {
      console.warn("Issue email skipped: No recipient email address for", recipient?.name);
    }

    res.status(201).json({
      success: true,
      message: 'Asset successfully allocated',
      data: { allocation },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Process return of an allocated asset, record condition, and update status.
 * Calculates elapsed custody duration and dispatches official return email exactly once.
 */
export const returnAllocation = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const allocation = await allocationService.returnAllocation({
      allocationId: req.params.id,
      returnCondition: req.body.returnCondition,
      notes: req.body.notes,
      fineAmount: req.body.fineAmount,
      fineReason: req.body.fineReason,
      finePaid: req.body.finePaid,
      finePaymentMode: req.body.finePaymentMode,
      returnedById: req.user.id,
      ipAddress,
    });

    const recipient = allocation.recipient;
    const userRole = recipient?.role || 'STUDENT';
    const asset = allocation.asset;

    // Calculate total custody duration between issueDate and returnDate
    const durationText = formatAllocationDuration(allocation.issuedAt, allocation.returnedAt || new Date());

    // Send return clearance email exactly once (unless caller explicitly opted out)
    const shouldSendEmail = req.body.sendEmail !== false;

    if (shouldSendEmail && recipient?.email) {
      sendLaptopReturnedEmail({
        to: recipient.email,
        userName: recipient.name,
        rollNumber: recipient.rollNumberOrEmpId,
        employeeId: recipient.rollNumberOrEmpId,
        userRole,
        courseBranch: recipient.branch || recipient.department?.name || recipient.track,
        semesterYear: recipient.batchYear ? `Batch ${recipient.batchYear}` : recipient.section,
        department: recipient.department?.name || recipient.branch || (userRole === 'STUDENT' ? 'Student Body' : 'SSISM Faculty'),
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
        returnDate: allocation.returnedAt ? new Date(allocation.returnedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        duration: durationText,
        returnCondition: allocation.returnCondition,
        fineAmount: allocation.fineAmount,
        finePaid: allocation.finePaid,
        returnedBy: allocation.returnedBy?.name,
        notes: req.body.notes || allocation.notes,
      }).catch((err) => {
        console.error("Failed to send return clearance email to:", recipient.email, err.message);
      });
    } else if (!recipient?.email) {
      console.warn("Return email skipped: No recipient email address for", recipient?.name);
    }

    res.status(200).json({
      success: true,
      message: 'Asset returned and logged successfully',
      data: { allocation, duration: durationText },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Fetch official allocation receipt data by ID.
 */
export const getReceipt = async (req, res, next) => {
  try {
    const receipt = await allocationService.getAllocationReceiptData(req.params.id);
    res.status(200).json({ success: true, data: { receipt } });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Delete an allocation record from database.
 */
export const deleteAllocation = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await allocationService.deleteAllocation(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Manually dispatch or re-send email receipt to recipient on demand.
 * Delivers official notice to both Students and Faculty.
 */
export const sendEmailReceipt = async (req, res, next) => {
  try {
    const allocation = await allocationService.getAllocationReceiptData(req.params.id);
    const recipient = allocation.recipient;
    const userRole = recipient?.role || 'STUDENT';
    const asset = allocation.asset;

    if (!recipient?.email) {
      return res.status(400).json({
        success: false,
        message: 'Recipient does not have a registered email address',
      });
    }

    let result;
    if (allocation.status === 'RETURNED') {
      const durationText = formatAllocationDuration(allocation.issuedAt, allocation.returnedAt || new Date());
      result = await sendLaptopReturnedEmail({
        to: recipient.email,
        userName: recipient.name,
        rollNumber: recipient.rollNumberOrEmpId,
        employeeId: recipient.rollNumberOrEmpId,
        userRole,
        courseBranch: recipient.branch || recipient.department?.name || recipient.track,
        semesterYear: recipient.batchYear ? `Batch ${recipient.batchYear}` : recipient.section,
        department: recipient.department?.name || recipient.branch || (userRole === 'STUDENT' ? 'Student Body' : 'SSISM Faculty'),
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
        returnDate: allocation.returnedAt ? new Date(allocation.returnedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        duration: durationText,
        returnCondition: allocation.returnCondition,
        fineAmount: allocation.fineAmount,
        finePaid: allocation.finePaid,
        returnedBy: allocation.returnedBy?.name,
        notes: allocation.notes,
      });
    } else {
      result = await sendLaptopIssuedEmail({
        to: recipient.email,
        userName: recipient.name,
        rollNumber: recipient.rollNumberOrEmpId,
        employeeId: recipient.rollNumberOrEmpId,
        userRole,
        courseBranch: recipient.branch || recipient.department?.name || recipient.track,
        semesterYear: recipient.batchYear ? `Batch ${recipient.batchYear}` : recipient.section,
        department: recipient.department?.name || recipient.branch || (userRole === 'STUDENT' ? 'Student Body' : 'SSISM Faculty'),
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        condition: allocation.issueCondition || asset.condition,
        chargerSerial: asset.chargerSerial,
        accessories: allocation.accessories,
        issuedBy: allocation.issuedBy?.name,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
        expectedReturnDate: (allocation.expectedReturnDate || allocation.dueDate)
          ? new Date(allocation.expectedReturnDate || allocation.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : undefined,
        dueDate: (allocation.expectedReturnDate || allocation.dueDate)
          ? new Date(allocation.expectedReturnDate || allocation.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : undefined,
        notes: allocation.notes,
      });
    }

    res.status(200).json({
      success: true,
      message: result.sent
        ? `Email notification sent to ${recipient.email}`
        : `Email notification processed for ${recipient.name} (${result.error || 'Simulated'})`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};


