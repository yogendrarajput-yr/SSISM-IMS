import * as allocationService from '../services/allocation.service.js';
import {
  sendLaptopIssuedEmail,
  sendLaptopReturnedEmail,
  isFacultyOrEmployee,
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
 * Step 3: Sends email ONLY to Faculty/Employees upon laptop issue.
 */
export const createAllocation = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const allocation = await allocationService.createAllocation({
      ...req.body,
      issuedById: req.user.id,
      ipAddress,
    });

    // Step 3 Filter: Check user role/type
    const recipient = allocation.recipient;
    const userRole = recipient?.role;
    const asset = allocation.asset;

    if (isFacultyOrEmployee(userRole)) {
      // Send asynchronously without blocking the primary HTTP response
      sendLaptopIssuedEmail({
        to: recipient.email,
        userName: recipient.name,
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN') : undefined,
        dueDate: allocation.dueDate ? new Date(allocation.dueDate).toLocaleDateString('en-IN') : undefined,
        userRole,
        notes: allocation.notes,
      }).catch((err) => {
        console.error("Failed to send email to Faculty:", recipient.email, err.message);
      });
    } else {
      console.log("Email skipped for STUDENT role:", recipient?.email || recipient?.name || 'Unknown Student');
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
 * Step 3: Sends email ONLY to Faculty/Employees upon laptop return.
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

    // Step 3 Filter: Check user role/type
    const recipient = allocation.recipient;
    const userRole = recipient?.role;
    const asset = allocation.asset;

    if (isFacultyOrEmployee(userRole)) {
      // Send asynchronously without blocking the primary HTTP response
      sendLaptopReturnedEmail({
        to: recipient.email,
        userName: recipient.name,
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        returnDate: allocation.returnedAt ? new Date(allocation.returnedAt).toLocaleDateString('en-IN') : undefined,
        returnCondition: allocation.returnCondition,
        userRole,
        notes: allocation.notes,
      }).catch((err) => {
        console.error("Failed to send email to Faculty:", recipient.email, err.message);
      });
    } else {
      console.log("Email skipped for STUDENT role:", recipient?.email || recipient?.name || 'Unknown Student');
    }

    res.status(200).json({
      success: true,
      message: 'Asset returned and logged successfully',
      data: { allocation },
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
 * Controller: Manually dispatch or re-send email receipt to recipient.
 * Enforces role restriction: Emails ONLY sent to Faculty/Employees.
 */
export const sendEmailReceipt = async (req, res, next) => {
  try {
    const allocation = await allocationService.getAllocationReceiptData(req.params.id);
    const recipient = allocation.recipient;
    const userRole = recipient?.role;
    const asset = allocation.asset;

    if (!isFacultyOrEmployee(userRole)) {
      console.log("Email skipped for STUDENT role:", recipient?.email || recipient?.name || 'Unknown Student');
      return res.status(200).json({
        success: true,
        message: 'Email notification skipped: Policy applies only to Faculty/Employees',
        data: { skipped: true, role: userRole },
      });
    }

    let result;
    if (allocation.status === 'RETURNED') {
      result = await sendLaptopReturnedEmail({
        to: recipient.email,
        userName: recipient.name,
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        returnDate: allocation.returnedAt ? new Date(allocation.returnedAt).toLocaleDateString('en-IN') : undefined,
        returnCondition: allocation.returnCondition,
        userRole,
        notes: allocation.notes,
      });
    } else {
      result = await sendLaptopIssuedEmail({
        to: recipient.email,
        userName: recipient.name,
        laptopModel: `${asset.make} ${asset.model}`.trim(),
        serialNumber: asset.serialNumber,
        assetTag: asset.assetTag,
        issueDate: allocation.issuedAt ? new Date(allocation.issuedAt).toLocaleDateString('en-IN') : undefined,
        dueDate: allocation.dueDate ? new Date(allocation.dueDate).toLocaleDateString('en-IN') : undefined,
        userRole,
        notes: allocation.notes,
      });
    }

    res.status(200).json({
      success: true,
      message: result.sent
        ? `Email notification sent to Faculty: ${recipient.email}`
        : `Email notification processed for ${recipient.name} (${result.error || 'Simulated'})`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};


