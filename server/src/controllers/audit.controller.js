import * as auditService from '../services/audit.service.js';

/**
 * Controller: Retrieve chronological audit logs with actor and entity filters.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Delete a single audit log entry by ID.
 */
export const deleteAuditLog = async (req, res, next) => {
  try {
    const result = await auditService.deleteAuditLog(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Purge all audit logs (Super Admin only).
 */
export const purgeAuditLogs = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await auditService.purgeAuditLogs(req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
};


