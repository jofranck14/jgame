const SUPERADMIN_ID = 681640130;

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) { res.status(401); return next(new Error("Not authenticated")); }
    if (!allowedRoles.includes(role)) { res.status(403); return next(new Error("Forbidden")); }
    return next();
  };
}

// Empêche toute action sur le superadmin (ban, suppression, changement de rôle)
function protectSuperAdmin(req, res, next) {
  const targetId = Number(req.params.id);
  if (targetId === SUPERADMIN_ID) {
    res.status(403);
    return next(new Error("This account is protected and cannot be modified"));
  }
  return next();
}

module.exports = { requireRole, protectSuperAdmin };