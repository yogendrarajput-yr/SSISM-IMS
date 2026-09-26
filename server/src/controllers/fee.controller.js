import * as feeService from '../services/fee.service.js';

/**
 * Controller: Get paginated list of student software license fee records.
 */
export const getFees = async (req, res, next) => {
  try {
    const result = await feeService.getFeeRecordsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Update payment status, receipt number, and notes for a fee record.
 */
export const updateFee = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const record = await feeService.updateFeeRecord(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({
      success: true,
      message: 'License fee status updated successfully',
      data: { record },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Check software license fee clearance status for a student.
 */
export const checkStudentFee = async (req, res, next) => {
  try {
    const result = await feeService.checkStudentFeeStatus(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Delete a license fee record by ID.
 */
export const deleteFee = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await feeService.deleteFeeRecord(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};


