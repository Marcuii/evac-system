/**
 * @fileoverview Admin Authentication Middleware
 * @description Protects admin-only routes by validating the x-admin-auth header.
 *              All floor management, status updates, and system operations require
 *              this middleware for authorization.
 * 
 * @requires dotenv - Environment variables must be loaded before this middleware
 * 
 * @env {string} ADMIN_AUTH_TOKEN - Secret token for admin authentication
 *                                  Default: 'admin-secret-token-2026'
 * 
 * @example
 * // Usage in route files:
 * import adminAuth from '../middleware/adminAuth.js';
 * router.use(adminAuth); // Protect all routes
 * // OR
 * router.post('/sensitive', adminAuth, controller); // Protect single route
 * 
 * @example
 * // Client request:
 * fetch('/api/floors', {
 *   headers: { 'x-admin-auth': 'admin-secret-token-2026' }
 * });
 * 
 * @module middleware/adminAuth
 * @author Marcelino Saad
 * @version 1.0.0
 */

/**
 * Express middleware to verify admin authentication.
 * 
 * @function adminAuth
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void|Response} Calls next() if authenticated, returns 403 otherwise
 * 
 * @description
 * Validates the 'x-admin-auth' header against ADMIN_AUTH_TOKEN environment variable.
 * - If valid: Proceeds to the next middleware/controller
 * - If invalid: Returns 403 Forbidden with standardized error response
 */
export default function adminAuth(req, res, next) {
  // Compare header token with environment secret
  const isAdmin = req.headers["x-admin-auth"] === process.env.ADMIN_AUTH_TOKEN;
  
  if (!isAdmin) {
    return res.status(403).json({
      status: 403,
      data: {
        data: null,
        message: "Admin access required",
      },
    });
  }
  
  // Authentication successful - proceed to route handler
  next();
}