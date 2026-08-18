const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");
const { computeGlobalDashboard } = require("../engine/costEngine");

const router = express.Router();
router.use(requireAuth);

router.get("/global", requireModule("SYS_GLOBAL_DASHBOARD", "view"), (req, res) => {
  try {
    res.json(computeGlobalDashboard());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Rate & Tariff Master (system-wide constants) ----
router.get("/rate-tariff-master", requireModule("SYS_RATE_TARIFF_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM rate_tariff_master ORDER BY id").all());
});

router.post("/rate-tariff-master", requireModule("SYS_RATE_TARIFF_MASTER", "edit"), (req, res) => {
  const { param_code, param_name, value, applies_to } = req.body;
  if (!param_code || !param_name || value === undefined) return res.status(400).json({ error: "param_code, param_name and value are required" });
  try {
    const info = db.prepare(
      `INSERT INTO rate_tariff_master (param_code, param_name, value, applies_to) VALUES (?,?,?,?)`
    ).run(param_code.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), param_name, Number(value), applies_to || "");
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/rate-tariff-master/:id", requireModule("SYS_RATE_TARIFF_MASTER", "edit"), (req, res) => {
  const { param_name, value, applies_to } = req.body;
  const existing = db.prepare("SELECT * FROM rate_tariff_master WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare(`UPDATE rate_tariff_master SET param_name = ?, value = ?, applies_to = ? WHERE id = ?`).run(
    param_name !== undefined ? param_name : existing.param_name,
    value !== undefined ? Number(value) : existing.value,
    applies_to !== undefined ? applies_to : existing.applies_to,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/rate-tariff-master/:id", requireModule("SYS_RATE_TARIFF_MASTER", "edit"), (req, res) => {
  db.prepare("DELETE FROM rate_tariff_master WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Rate Type Master ----
router.get("/rate-type-master", requireModule("SYS_RATE_TYPE_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM rate_type_master ORDER BY id").all());
});

router.post("/rate-type-master", requireModule("SYS_RATE_TYPE_MASTER", "edit"), (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) return res.status(400).json({ error: "code and name are required" });
  try {
    const info = db.prepare(`INSERT INTO rate_type_master (code, name, description) VALUES (?,?,?)`).run(
      code.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), name, description || ""
    );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/rate-type-master/:id", requireModule("SYS_RATE_TYPE_MASTER", "edit"), (req, res) => {
  const { name, description } = req.body;
  db.prepare(`UPDATE rate_type_master SET name = ?, description = ? WHERE id = ?`).run(name, description || "", req.params.id);
  res.json({ ok: true });
});

router.delete("/rate-type-master/:id", requireModule("SYS_RATE_TYPE_MASTER", "edit"), (req, res) => {
  db.prepare("DELETE FROM rate_type_master WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/allocation-basis-master", requireModule("SYS_ALLOCATION_BASIS_MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM allocation_basis_master ORDER BY id").all());
});

router.post("/allocation-basis-master", requireModule("SYS_ALLOCATION_BASIS_MASTER", "edit"), (req, res) => {
  const { classification, department_name, cost_component, basis_of_allocation } = req.body;
  if (!department_name || !cost_component || !basis_of_allocation) {
    return res.status(400).json({ error: "department_name, cost_component and basis_of_allocation are required" });
  }
  const info = db.prepare(
    `INSERT INTO allocation_basis_master (classification, department_name, cost_component, basis_of_allocation) VALUES (?,?,?,?)`
  ).run(classification || "", department_name, cost_component, basis_of_allocation);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/allocation-basis-master/:id", requireModule("SYS_ALLOCATION_BASIS_MASTER", "edit"), (req, res) => {
  const { classification, department_name, cost_component, basis_of_allocation } = req.body;
  db.prepare(
    `UPDATE allocation_basis_master SET classification=?, department_name=?, cost_component=?, basis_of_allocation=? WHERE id=?`
  ).run(classification || "", department_name, cost_component, basis_of_allocation, req.params.id);
  res.json({ ok: true });
});

router.delete("/allocation-basis-master/:id", requireModule("SYS_ALLOCATION_BASIS_MASTER", "edit"), (req, res) => {
  db.prepare("DELETE FROM allocation_basis_master WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
