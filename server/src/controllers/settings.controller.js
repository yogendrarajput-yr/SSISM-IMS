import * as settingsService from '../services/settings.service.js';

export const getMasterSettings = async (req, res, next) => {
  try {
    const data = await settingsService.getMasterSettingsOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const department = await settingsService.createDepartment(req.body, req.user.id, ipAddress);
    res.status(201).json({ success: true, data: { department }, message: 'Department created.' });
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const department = await settingsService.updateDepartment(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: { department }, message: 'Department updated.' });
  } catch (err) {
    next(err);
  }
};

export const archiveDepartment = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await settingsService.archiveDepartment(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message, data: result.department });
  } catch (err) {
    next(err);
  }
};

export const restoreDepartment = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await settingsService.restoreDepartment(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message, data: result.department });
  } catch (err) {
    next(err);
  }
};

export const getArchived = async (req, res, next) => {
  try {
    const data = await settingsService.getArchivedRecords();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await settingsService.deleteDepartment(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const category = await settingsService.createCategory(req.body, req.user.id, ipAddress);
    res.status(201).json({ success: true, data: { category }, message: 'Category created.' });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const category = await settingsService.updateCategory(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: { category }, message: 'Category updated.' });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await settingsService.deleteCategory(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};
