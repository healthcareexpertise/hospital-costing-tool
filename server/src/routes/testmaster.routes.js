const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireDeptModule } = require("../middleware/rbac");
const { computeTestDepartmentOutput } = require("../engine/costEngine");

const router = express.Router();
router.use(requireAuth);

function resolveDept(req, res, next) {
  const dept = db.prepare("SELECT * FROM departments WHERE code = ? AND hospital_id = ?").get(req.params.deptCode, req.user.hospital_id);
  if (!dept) return res.status(404).json({ error: "Unknown department code" });
  req.dept = dept;
  next();
}

// List of sub-departments used within this department, for the tab UI
router.get("/:deptCode/sub-departments", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  const rows = db.prepare("SELECT DISTINCT sub_department FROM test_master WHERE department_id = ? ORDER BY sub_department").all(req.dept.id);
  res.json(rows.map((r) => r.sub_department));
});

// ---- Test rows (optionally filtered by ?sub_department=) ----
router.get("/:deptCode/tests", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  const sub = req.query.sub_department;
  const rows = sub
    ? db.prepare("SELECT * FROM test_master WHERE department_id = ? AND sub_department = ? ORDER BY sl_no").all(req.dept.id, sub)
    : db.prepare("SELECT * FROM test_master WHERE department_id = ? ORDER BY sub_department, sl_no").all(req.dept.id);
  res.json(rows);
});

router.post("/:deptCode/tests", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { sub_department, test_name, direct_cost, doctor_fee, reagent_id, equipment_id, notes } = req.body;
  if (!test_name) return res.status(400).json({ error: "test_name is required" });
  const next = (db.prepare("SELECT COALESCE(MAX(sl_no),0)+1 as n FROM test_master WHERE department_id = ? AND sub_department IS ?").get(req.dept.id, sub_department || null)).n;
  const info = db.prepare(`INSERT INTO test_master (department_id, sub_department, sl_no, test_name, direct_cost, doctor_fee, reagent_id, equipment_id, notes) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(req.dept.id, sub_department || null, next, test_name, direct_cost || 0, doctor_fee || 0, reagent_id || null, equipment_id || null, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:deptCode/tests/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { test_name, direct_cost, doctor_fee, reagent_id, equipment_id, notes } = req.body;
  const existing = db.prepare("SELECT * FROM test_master WHERE id = ? AND department_id = ?").get(req.params.id, req.dept.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare(`UPDATE test_master SET test_name=?, direct_cost=?, doctor_fee=?, reagent_id=?, equipment_id=?, notes=? WHERE id=?`).run(
    test_name !== undefined ? test_name : existing.test_name,
    direct_cost !== undefined ? direct_cost : existing.direct_cost,
    doctor_fee !== undefined ? doctor_fee : existing.doctor_fee,
    reagent_id !== undefined ? (reagent_id || null) : existing.reagent_id,
    equipment_id !== undefined ? (equipment_id || null) : existing.equipment_id,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/:deptCode/tests/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const row = db.prepare("SELECT sl_no, sub_department FROM test_master WHERE id = ? AND department_id = ?").get(req.params.id, req.dept.id);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM test_master WHERE id = ? AND department_id = ?").run(req.params.id, req.dept.id);
    if (row) db.prepare("UPDATE test_master SET sl_no = sl_no - 1 WHERE department_id = ? AND sub_department IS ? AND sl_no > ?").run(req.dept.id, row.sub_department, row.sl_no);
  });
  tx();
  res.json({ ok: true });
});

// ---- Reagent Master (kit cost ÷ tests per kit = cost per test) — the reagent a Lab
// test consumes. Link a test to one via reagent_id on the Test Master screen. ----
router.get("/:deptCode/reagents", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  const sub = req.query.sub_department;
  const rows = sub
    ? db.prepare("SELECT * FROM reagent_master WHERE department_id = ? AND sub_department = ? ORDER BY item_name").all(req.dept.id, sub)
    : db.prepare("SELECT * FROM reagent_master WHERE department_id = ? ORDER BY sub_department, item_name").all(req.dept.id);
  res.json(rows.map((r) => ({ ...r, cost_per_test: r.tests_per_kit ? Math.round((r.kit_cost / r.tests_per_kit) * 100) / 100 : 0 })));
});

router.post("/:deptCode/reagents", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { sub_department, item_name, kit_cost, tests_per_kit, notes } = req.body;
  if (!item_name) return res.status(400).json({ error: "item_name is required" });
  const info = db.prepare(`INSERT INTO reagent_master (department_id, sub_department, item_name, kit_cost, tests_per_kit, notes) VALUES (?,?,?,?,?,?)`)
    .run(req.dept.id, sub_department || null, item_name, kit_cost || 0, tests_per_kit || 1, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:deptCode/reagents/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { item_name, kit_cost, tests_per_kit, notes } = req.body;
  db.prepare(`UPDATE reagent_master SET item_name=?, kit_cost=?, tests_per_kit=?, notes=? WHERE id=? AND department_id=?`)
    .run(item_name, kit_cost || 0, tests_per_kit || 1, notes || null, req.params.id, req.dept.id);
  res.json({ ok: true });
});

router.delete("/:deptCode/reagents/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  db.prepare("UPDATE test_master SET reagent_id = NULL WHERE reagent_id = ?").run(req.params.id);
  db.prepare("DELETE FROM reagent_master WHERE id = ? AND department_id = ?").run(req.params.id, req.dept.id);
  res.json({ ok: true });
});

// ---- Equipment register (which machine runs which test) ----
router.get("/:deptCode/equipment", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  const sub = req.query.sub_department;
  const rows = sub
    ? db.prepare("SELECT * FROM test_equipment_master WHERE department_id = ? AND sub_department = ? ORDER BY equipment_name").all(req.dept.id, sub)
    : db.prepare("SELECT * FROM test_equipment_master WHERE department_id = ? ORDER BY sub_department, equipment_name").all(req.dept.id);
  res.json(rows);
});

router.post("/:deptCode/equipment", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { sub_department, equipment_name, cost_price, life_years, notes } = req.body;
  if (!equipment_name) return res.status(400).json({ error: "equipment_name is required" });
  const info = db.prepare(`INSERT INTO test_equipment_master (department_id, sub_department, equipment_name, cost_price, life_years, notes) VALUES (?,?,?,?,?,?)`)
    .run(req.dept.id, sub_department || null, equipment_name, cost_price || 0, life_years || 7, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:deptCode/equipment/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { equipment_name, cost_price, life_years, notes } = req.body;
  db.prepare(`UPDATE test_equipment_master SET equipment_name=?, cost_price=?, life_years=?, notes=? WHERE id=? AND department_id=?`)
    .run(equipment_name, cost_price || 0, life_years || 7, notes || null, req.params.id, req.dept.id);
  res.json({ ok: true });
});

router.delete("/:deptCode/equipment/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  db.prepare("UPDATE test_master SET equipment_id = NULL WHERE equipment_id = ?").run(req.params.id);
  db.prepare("DELETE FROM test_equipment_master WHERE id = ? AND department_id = ?").run(req.params.id, req.dept.id);
  res.json({ ok: true });
});

// ---- Overhead constants, per sub-department (annual totals + test volumes — see
// costEngine.js for how these combine into a live per-test rate) ----
router.get("/:deptCode/overhead", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  const sub = req.query.sub_department;
  if (!sub) return res.status(400).json({ error: "sub_department query param is required" });
  const overhead = db.prepare("SELECT * FROM test_overhead_master WHERE department_id = ? AND sub_department = ?").get(req.dept.id, sub);
  if (!overhead) return res.json(null);
  const annualTotal = (overhead.manpower_annual_total || 0) + (overhead.equipment_annual_total || 0) + (overhead.building_annual_total || 0) +
    (overhead.power_annual_total || 0) + (overhead.common_consumables_annual_total || 0);
  const actualVolume = overhead.actual_volume || 1;
  const standardVolume = overhead.standard_volume || 1;
  res.json({
    ...overhead,
    annual_total: Math.round(annualTotal * 100) / 100,
    overhead_per_test_actual: Math.round((annualTotal / actualVolume) * 100) / 100,
    overhead_per_test_standard: Math.round((annualTotal / standardVolume) * 100) / 100,
  });
});

router.put("/:deptCode/overhead", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const sub = req.query.sub_department || req.body.sub_department;
  if (!sub) return res.status(400).json({ error: "sub_department is required" });
  const cols = [
    "manpower_annual_total", "equipment_annual_total", "building_annual_total",
    "power_annual_total", "common_consumables_annual_total", "actual_volume", "standard_volume", "notes",
  ];
  const vals = cols.map((c) => (req.body[c] !== undefined ? req.body[c] : (c === "actual_volume" || c === "standard_volume" ? 1 : 0)));
  const existing = db.prepare("SELECT id FROM test_overhead_master WHERE department_id = ? AND sub_department = ?").get(req.dept.id, sub);
  if (existing) {
    db.prepare(`UPDATE test_overhead_master SET ${cols.map((c) => c + "=?").join(",")} WHERE department_id=? AND sub_department=?`).run(...vals, req.dept.id, sub);
  } else {
    db.prepare(`INSERT INTO test_overhead_master (department_id, sub_department, ${cols.join(",")}) VALUES (?,?,${cols.map(() => "?").join(",")})`).run(req.dept.id, sub, ...vals);
  }
  res.json({ ok: true });
});

// ---- Output (computed price list), optionally filtered by ?sub_department= ----
router.get("/:deptCode/output", resolveDept, requireDeptModule("OUTPUT", "view"), (req, res) => {
  try {
    res.json(computeTestDepartmentOutput(req.dept.id, req.query.sub_department));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:deptCode/dashboard", resolveDept, requireDeptModule("DASHBOARD", "view"), (req, res) => {
  try {
    res.json(computeTestDepartmentOutput(req.dept.id, req.query.sub_department));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
