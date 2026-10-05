import * as assetService from '../services/asset.service.js';

/**
 * Controller: Get paginated list of assets with search, status, and department filters.
 */
export const getAssets = async (req, res, next) => {
  try {
    const result = await assetService.getAssetsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get single asset by ID including full lifecycle timeline and maintenance logs.
 */
export const getAsset = async (req, res, next) => {
  try {
    const asset = await assetService.getAssetById(req.params.id);
    res.status(200).json({ success: true, data: { asset } });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Register a new hardware asset with audit logging.
 */
export const createAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const asset = await assetService.createAsset(req.body, req.user.id, ipAddress);
    res.status(201).json({
      success: true,
      message: 'Asset registered successfully',
      data: { asset },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Update hardware asset specifications or metadata.
 */
export const updateAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const asset = await assetService.updateAsset(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: { asset },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Soft-delete an unallocated asset with Active Constraint Lock.
 */
export const archiveAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.archiveAsset(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message, data: result.asset });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Restore a soft-deleted asset back to inventory.
 */
export const restoreAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.restoreAsset(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message, data: result.asset });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Bulk archive assets with Active Constraint Lock.
 */
export const bulkArchiveAssets = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.bulkArchiveAssets(req.body.ids, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: `Archived ${result.archivedCount} assets successfully.` });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Delete an unallocated asset (Super Admin only).
 */
export const deleteAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.deleteAsset(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Bulk permanently delete multiple assets.
 */
export const bulkDeleteAssets = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.bulkDeleteAssets(req.body.ids, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Quick instant global search across assets.
 */
export const searchAssets = async (req, res, next) => {
  try {
    const result = await assetService.globalQuickSearch(req.query.q);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Retrieve consolidated dashboard analytics and metrics.
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await assetService.getDashboardMetrics(req.query);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Record physical audit / verification on a hardware asset.
 */
export const verifyAsset = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.recordPhysicalVerification(
      req.params.id,
      req.body,
      req.user.id,
      ipAddress
    );
    res.status(200).json({
      success: true,
      message: 'Physical verification recorded successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Retrieve overdue physical audit report for laptops.
 */
export const getAuditOverdueReport = async (req, res, next) => {
  try {
    const report = await assetService.getPhysicalAuditOverdueReport(req.query);
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Log recurring AirFiber / Router device recharge.
 */
export const logRecharge = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await assetService.logRecharge(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({
      success: true,
      message: 'Recharge logged successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get recharge history for a specific AirFiber or Router asset.
 */
export const getRechargeHistory = async (req, res, next) => {
  try {
    const history = await assetService.getRechargeHistory(req.params.id);
    res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Retrieve upcoming and overdue AirFiber / Router recharge report.
 */
export const getRechargeDueReport = async (req, res, next) => {
  try {
    const report = await assetService.getRechargeDueReport();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};


