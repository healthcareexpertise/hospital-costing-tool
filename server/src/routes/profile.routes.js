const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

// List all profiles for this hospital
router.get("/", requireModule("SYS_PROFILE_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM profiles WHERE hospital_id = ? ORDER BY id").all(req.user.hospital_id));
});

// Create a new profile
router.post("/", requireModule("SYS_PROFILE_MASTER", "edit"), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const info = db.prepare("INSERT INTO profiles (hospital_id, name, description, is_system) VALUES (?,?,?,0)")
      .run(req.user.hospital_id, name, description || "");
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete a profile (system profiles protected)
router.delete("/:id", requireModule("SYS_PROFILE_MASTER", "edit"), (req, res) => {
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ? AND hospital_id = ?").get(req.params.id, req.user.hospital_id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  if (profile.is_system) return res.status(400).json({ error: "Cannot delete a system profile" });
  db.prepare("DELETE FROM profile_module_permissions WHERE profile_id = ?").run(req.params.id);
  db.prepare("DELETE FROM profiles WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// All modules relevant to this hospital (SYSTEM modules + this hospital's own department
// modules — never another hospital's), with this profile's current permissions.
router.get("/:id/modules", requireModule("SYS_PROFILE_MASTER", "view"), (req, res) => {
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ? AND hospital_id = ?").get(req.params.id, req.user.hospital_id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  const modules = db
    .prepare(
      `SELECT m.id, m.code, m.name, m.module_type, d.name as department_name, d.display_order,
              COALESCE(pmp.can_view,0) as can_view, COALESCE(pmp.can_edit,0) as can_edit
       FROM modules m
       LEFT JOIN departments d ON d.id = m.department_id
       LEFT JOIN profile_module_permissions pmp ON pmp.module_id = m.id AND pmp.profile_id = ?
       WHERE d.id IS NULL OR d.hospital_id = ?
       ORDER BY d.display_order IS NULL, d.display_order, m.module_type`
    )
    .all(req.params.id, req.user.hospital_id);
  res.json(modules);
});

// Bulk-update permissions for a profile: body = [{module_id, can_view, can_edit}, ...]
router.put("/:id/modules", requireModule("SYS_PROFILE_MASTER", "edit"), (req, res) => {
  const profileId = req.params.id;
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ? AND hospital_id = ?").get(profileId, req.user.hospital_id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  const updates = req.body.permissions || [];
  const stmt = db.prepare(
    `INSERT INTO profile_module_permissions (profile_id, module_id, can_view, can_edit) VALUES (?,?,?,?)
     ON CONFLICT(profile_id, module_id) DO UPDATE SET can_view=excluded.can_view, can_edit=excluded.can_edit`
  );
  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(profileId, r.module_id, r.can_view ? 1 : 0, r.can_edit ? 1 : 0);
  });
  tx(updates);
  res.json({ ok: true, updated: updates.length });
});

module.exports = router;
