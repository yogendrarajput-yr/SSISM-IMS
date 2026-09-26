import { AppError } from '../utils/appError.js';

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * 
 * Restricts route access to specified roles (e.g., SUPER_ADMIN, STAFF, HIGHER_MANAGEMENT).
 * 
 * @param {...string} allowedRoles - List of authorized role enum strings
 */
export const authorizeRoles = (...allowedRoles) => {

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Your role (${req.user.role}) does not have permission to perform this action.`,
          403
        )
      );
    }

    next();
  };
};
