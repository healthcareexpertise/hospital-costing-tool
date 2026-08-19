const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");
const { computeProcedureOutput } = require("../engine/costEngine");

const router = express.Router();
router.use(requireAuth);

// Open to any authenticated user — every profile needs this to populate the procedure selector,
// regardless of which department modules they're permitted to see.
router.get("/", (req, res) => {
  const rows = db.prepare(
    `SELECT p.id, p.code, p.name, s.code as specialty_code, s.name as specialty_name, s.display_order
     FROM procedures p JOIN specialties s ON s.id = p.specialty_id
     WHERE p.hospital_id = ?
     ORDER BY s.display_order, p.name`
  ).all(req.user.hospital_id);
  res.json(rows);
});

router.get("/specialties", (req, res) => {
  res.json(db.prepare("SELECT * FROM specialties WHERE hospital_id = ? ORDER BY display_order").all(req.user.hospital_id));
});

router.post("/specialties", requireModule("SYS_SPECIALTY_MASTER", "edit"), (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: "code and name are required" });
  try {
    const maxOrder = db.prepare("SELECT MAX(display_order) m FROM specialties WHERE hospital_id = ?").get(req.user.hospital_id).m || 0;
    const info = db.prepare("INSERT INTO specialties (hospital_id, code, name, display_order) VALUES (?,?,?,?)").run(
      req.user.hospital_id, code.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name, maxOrder + 1
    );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/specialties/:id", requireModule("SYS_SPECIALTY_MASTER", "edit"), (req, res) => {
  db.prepare("UPDATE specialties SET name = ? WHERE id = ? AND hospital_id = ?").run(req.body.name, req.params.id, req.user.hospital_id);
  res.json({ ok: true });
});

router.delete("/specialties/:id", requireModule("SYS_SPECIALTY_MASTER", "edit"), (req, res) => {
  const hasProcedures = db.prepare("SELECT COUNT(*) c FROM procedures WHERE specialty_id = ? AND hospital_id = ?").get(req.params.id, req.user.hospital_id).c;
  if (hasProcedures > 0) return res.status(400).json({ error: "Cannot delete a specialty that still has procedures — delete or reassign them first." });
  db.prepare("DELETE FROM specialties WHERE id = ? AND hospital_id = ?").run(req.params.id, req.user.hospital_id);
  res.json({ ok: true });
});

// Full package-cost breakdown for one procedure (sums every department that applies to it)
router.get("/:code/output", (req, res) => {
  const proc = db.prepare("SELECT * FROM procedures WHERE code = ? AND hospital_id = ?").get(req.params.code, req.user.hospital_id);
  if (!proc) return res.status(404).json({ error: "Unknown procedure code" });
  try {
    res.json(computeProcedureOutput(proc.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Procedure Master (admin CRUD) ----
router.post("/", requireModule("SYS_PROCEDURE_MASTER", "edit"), (req, res) => {
  const { specialty_code, code, name } = req.body;
  const specialty = db.prepare("SELECT id FROM specialties WHERE code = ? AND hospital_id = ?").get(specialty_code, req.user.hospital_id);
  if (!specialty) return res.status(400).json({ error: "Unknown specialty_code" });
  try {
    const info = db.prepare("INSERT INTO procedures (hospital_id, specialty_id, code, name) VALUES (?,?,?,?)")
      .run(req.user.hospital_id, specialty.id, code, name);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", requireModule("SYS_PROCEDURE_MASTER", "edit"), (req, res) => {
  const { name } = req.body;
  db.prepare("UPDATE procedures SET name = ? WHERE id = ? AND hospital_id = ?").run(name, req.params.id, req.user.hospital_id);
  res.json({ ok: true });
});

router.delete("/:id", requireModule("SYS_PROCEDURE_MASTER", "edit"), (req, res) => {
  const id = req.params.id;
  const proc = db.prepare("SELECT id FROM procedures WHERE id = ? AND hospital_id = ?").get(id, req.user.hospital_id);
  if (!proc) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM procedure_department_reference WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM department_input WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM manpower_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM materials_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM equipment_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM nonmedical_asset_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM ac_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM building_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM power_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM simple_asset_master WHERE procedure_id = ?").run(id);
  db.prepare("DELETE FROM procedures WHERE id = ?").run(id);
  res.json({ ok: true });
});

module.exports = router;
