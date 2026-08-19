const { db } = require("../db/db");

/**
 * requireModule(moduleCode, 'view'|'edit')
 * Looks up the caller's profile permission for the given module code.
 * Attach after requireAuth (expects req.user.profile_id).
 */
function requireModule(moduleCode, level = "view") {
  return (req, res, next) => {
    const mod = db.prepare("SELECT id FROM modules WHERE code = ?").get(moduleCode);
    if (!mod) return res.status(404).json({ error: `Unknown module ${moduleCode}` });
    const perm = db
      .prepare("SELECT can_view, can_edit FROM profile_module_permissions WHERE profile_id = ? AND module_id = ?")
      .get(req.user.profile_id, mod.id);
    const allowed = perm && ((level === "view" && perm.can_view) || (level === "edit" && perm.can_edit));
    if (!allowed) {
      return res.status(403).json({ error: `Not permitted: ${moduleCode} (${level})` });
    }
    next();
  };
}

/** Dynamic version for generic department routes: resolves the module via the caller's
 * own hospital's department (not a naming-convention string), so it works regardless of
 * how that department's module codes happen to be prefixed. */
function requireDeptModule(moduleType, level = "view") {
  return (req, res, next) => {
    const deptCode = req.params.deptCode;
    const dept = db.prepare("SELECT id FROM departments WHERE code = ? AND hospital_id = ?").get(deptCode, req.user.hospital_id);
    if (!dept) return res.status(404).json({ error: `Unknown department ${deptCode}` });
    const mod = db.prepare("SELECT id FROM modules WHERE department_id = ? AND module_type = ?").get(dept.id, moduleType);
    if (!mod) return res.status(404).json({ error: `Unknown module ${deptCode}_${moduleType}` });
    const perm = db
      .prepare("SELECT can_view, can_edit FROM profile_module_permissions WHERE profile_id = ? AND module_id = ?")
      .get(req.user.profile_id, mod.id);
    const allowed = perm && ((level === "view" && perm.can_view) || (level === "edit" && perm.can_edit));
    if (!allowed) {
      return res.status(403).json({ error: `Not permitted: ${deptCode}_${moduleType} (${level})` });
    }
    next();
  };
}

/** Gate for cross-hospital management routes (Hospital Master) — platform admins only. */
function requirePlatformAdmin(req, res, next) {
  if (!req.user.is_platform_admin) {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  next();
}

module.exports = { requireModule, requireDeptModule, requirePlatformAdmin };
