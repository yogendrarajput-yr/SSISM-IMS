import * as maintenanceService from '../services/maintenance.service.js';

/**
 * Controller: Get paginated list of maintenance and upgrade logs.
 */
export const getMaintenanceLogs = async (req, res, next) => {
  try {
    const result = await maintenanceService.getMaintenanceLogsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Record a hardware repair, component upgrade, or service log.
 */
export const createMaintenanceLog = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const log = await maintenanceService.createMaintenanceLogRecord(req.body, req.user.id, ipAddress);
    res.status(201).json({
      success: true,
      message: 'Maintenance / upgrade activity logged successfully',
      data: { log },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Delete a maintenance log record by ID.
 */
export const deleteMaintenanceLog = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await maintenanceService.deleteMaintenanceLog(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};


