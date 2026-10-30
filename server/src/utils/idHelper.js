/**
 * Safe ID helper functions for MongoDB ObjectId support.
 * 
 * Ensures IDs are cleanly handled as strings for MongoDB Prisma queries
 * without risk of NaN or type errors.
 */

/**
 * Convert value to string ID or undefined (for optional query filters).
 */
export const toId = (val) => {
  if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined' || val === 'ALL') {
    return undefined;
  }
  return String(val).trim();
};

/**
 * Convert value to string ID or null (for database foreign key assignments).
 */
export const toNullableId = (val) => {
  if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined' || val === 'ALL') {
    return null;
  }
  return String(val).trim();
};

/**
 * Convert an array of IDs or comma-delimited string to array of string IDs.
 */
export const toIdArray = (ids) => {
  if (!ids) return [];
  if (Array.isArray(ids)) {
    return ids.map(toId).filter(Boolean);
  }
  return String(ids)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'null' && s !== 'undefined');
};
