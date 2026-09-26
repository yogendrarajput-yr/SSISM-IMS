import * as donorService from '../services/donor.service.js';

/**
 * Controller: Get paginated donors list with search and summary stats.
 */
export const getDonors = async (req, res, next) => {
  try {
    const result = await donorService.getDonorsList(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get donor profile by ID with associated donated laptops.
 */
export const getDonorById = async (req, res, next) => {
  try {
    const donor = await donorService.getDonorById(req.params.id);
    res.status(200).json({ success: true, data: { donor } });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get list of assets donated by specific donor.
 */
export const getDonorAssets = async (req, res, next) => {
  try {
    const donor = await donorService.getDonorById(req.params.id);
    res.status(200).json({ success: true, data: { assets: donor.assets || [] } });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Register a new donor in the master registry.
 */
export const createDonor = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const donor = await donorService.createDonor(req.body, req.user.id, ipAddress);
    res.status(201).json({ success: true, data: { donor }, message: 'Donor registered successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Update existing donor record.
 */
export const updateDonor = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const donor = await donorService.updateDonor(req.params.id, req.body, req.user.id, ipAddress);
    res.status(200).json({ success: true, data: { donor }, message: 'Donor updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Remove donor record.
 */
export const deleteDonor = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = await donorService.deleteDonor(req.params.id, req.user.id, ipAddress);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};
