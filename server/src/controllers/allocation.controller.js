import * as allocationService from '../services/allocation.service.js';

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
 */
export const createAllocation = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const allocation = await allocationService.createAllocation({
      ...req.body,
      issuedById: req.user.id,
      ipAddress,
    });

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


