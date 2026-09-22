// ============================================================
// RBAC Permission Middleware
// ============================================================
// Usage:
//   router.get('/products', requirePermission('view_product'), handler)
//
// Bypass roles (SUPER_ADMIN, ADMIN) get access to everything.
// Every other role must have the permission in their `permissions` array.
// ============================================================

const BYPASS_ROLES = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Middleware factory. Returns a middleware that checks whether
 * the authenticated admin has the given permission.
 *
 * @param {string} permission - e.g. 'view_product'
 */
exports.requirePermission = (permission) => (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const role = user.role;

  // Privileged roles bypass all permission checks
  if (BYPASS_ROLES.includes(role)) {
    return next();
  }

  // Everyone else must have the specific permission
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (!permissions.includes(permission)) {
    return res.status(403).json({
      message: `Access denied. Missing permission: ${permission}`,
      requiredPermission: permission,
    });
  }

  next();
};