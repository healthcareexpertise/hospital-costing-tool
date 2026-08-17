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

/** Dynamic version for generic department routes: builds the module code from params. */
function requireDeptModule(moduleType, level = "view") {
  return (req, res, next) => {
    const deptCode = req.params.deptCode;
    const code = `${deptCode}_${moduleType}`;
    return requireModule(code, level)(req, res, next);
  };
}

module.exports = { requireModule, requireDeptModule };
