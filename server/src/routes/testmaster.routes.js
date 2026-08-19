const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireDeptModule } = require("../middleware/rbac");
const { computeTestDepartmentOutput } = require("../engine/costEngine");

const router = express.Router();
router.use(requireAuth);

function resolveDept(req, res, next) {
  const dept = db.prepare("SELECT * FROM departments WHERE code = ?").get(req.params.deptCode);
  if (!dept) return res.status(404).json({ error: "Unknown department code" });
  req.dept = dept;
  next();
}

// ---- Test rows ----
router.get("/:deptCode/tests", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM test_master WHERE department_id = ? ORDER BY sl_no").all(req.dept.id));
});

router.post("/:deptCode/tests", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { test_name, direct_cost, doctor_fee, notes } = req.body;
  if (!test_name) return res.status(400).json({ error: "test_name is required" });
  const next = (db.prepare("SELECT COALESCE(MAX(sl_no),0)+1 as n FROM test_master WHERE department_id = ?").get(req.dept.id)).n;
  const info = db.prepare(`INSERT INTO test_master (department_id, sl_no, test_name, direct_cost, doctor_fee, notes) VALUES (?,?,?,?,?,?)`)
    .run(req.dept.id, next, test_name, direct_cost || 0, doctor_fee || 0, notes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put("/:deptCode/tests/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const { test_name, direct_cost, doctor_fee, notes } = req.body;
  const existing = db.prepare("SELECT * FROM test_master WHERE id = ? AND department_id = ?").get(req.params.id, req.dept.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare(`UPDATE test_master SET test_name=?, direct_cost=?, doctor_fee=?, notes=? WHERE id=?`).run(
    test_name !== undefined ? test_name : existing.test_name,
    direct_cost !== undefined ? direct_cost : existing.direct_cost,
    doctor_fee !== undefined ? doctor_fee : existing.doctor_fee,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/:deptCode/tests/:id", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const row = db.prepare("SELECT sl_no FROM test_master WHERE id = ? AND department_id = ?").get(req.params.id, req.dept.id);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM test_master WHERE id = ? AND department_id = ?").run(req.params.id, req.dept.id);
    if (row) db.prepare("UPDATE test_master SET sl_no = sl_no - 1 WHERE department_id = ? AND sl_no > ?").run(req.dept.id, row.sl_no);
  });
  tx();
  res.json({ ok: true });
});

// ---- Overhead constants ----
router.get("/:deptCode/overhead", resolveDept, requireDeptModule("MASTER", "view"), (req, res) => {
  res.json(db.prepare("SELECT * FROM test_overhead_master WHERE department_id = ?").get(req.dept.id) || null);
});

router.put("/:deptCode/overhead", resolveDept, requireDeptModule("MASTER", "edit"), (req, res) => {
  const cols = [
    "manpower_actual", "manpower_standard", "equipment_actual", "equipment_standard",
    "building_actual", "building_standard", "power_actual", "power_standard",
    "common_consumables_actual", "common_consumables_standard", "notes",
  ];
  const vals = cols.map((c) => (req.body[c] !== undefined ? req.body[c] : 0));
  const existing = db.prepare("SELECT id FROM test_overhead_master WHERE department_id = ?").get(req.dept.id);
  if (existing) {
    db.prepare(`UPDATE test_overhead_master SET ${cols.map((c) => c + "=?").join(",")} WHERE department_id=?`).run(...vals, req.dept.id);
  } else {
    db.prepare(`INSERT INTO test_overhead_master (department_id, ${cols.join(",")}) VALUES (?,${cols.map(() => "?").join(",")})`).run(req.dept.id, ...vals);
  }
  res.json({ ok: true });
});

// ---- Output (computed price list) ----
router.get("/:deptCode/output", resolveDept, requireDeptModule("OUTPUT", "view"), (req, res) => {
  try {
    res.json(computeTestDepartmentOutput(req.dept.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:deptCode/dashboard", resolveDept, requireDeptModule("DASHBOARD", "view"), (req, res) => {
  try {
    res.json(computeTestDepartmentOutput(req.dept.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
