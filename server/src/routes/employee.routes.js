const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireModule } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

router.get("/", requireModule("SYS_EMPLOYEE_MASTER", "view"), (req, res) => {
  res.json(
    db.prepare(
      `SELECT e.*, d.name as department_name FROM employee_master e LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.hospital_id = ? ORDER BY e.full_name`
    ).all(req.user.hospital_id)
  );
});

router.post("/", requireModule("SYS_EMPLOYEE_MASTER", "edit"), (req, res) => {
  const { emp_code, full_name, designation, department_id, contact, monthly_salary } = req.body;
  if (!full_name) return res.status(400).json({ error: "full_name is required" });
  try {
    const info = db.prepare(
      `INSERT INTO employee_master (hospital_id, emp_code, full_name, designation, department_id, contact, monthly_salary) VALUES (?,?,?,?,?,?,?)`
    ).run(req.user.hospital_id, emp_code || null, full_name, designation || null, department_id || null, contact || null, monthly_salary || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", requireModule("SYS_EMPLOYEE_MASTER", "edit"), (req, res) => {
  const { emp_code, full_name, designation, department_id, contact, monthly_salary, active } = req.body;
  db.prepare(
    `UPDATE employee_master SET emp_code=?, full_name=?, designation=?, department_id=?, contact=?, monthly_salary=?, active=? WHERE id=? AND hospital_id=?`
  ).run(emp_code || null, full_name, designation || null, department_id || null, contact || null, monthly_salary || null, active === false ? 0 : 1, req.params.id, req.user.hospital_id);
  res.json({ ok: true });
});

router.delete("/:id", requireModule("SYS_EMPLOYEE_MASTER", "edit"), (req, res) => {
  db.prepare("UPDATE manpower_master SET employee_id = NULL WHERE employee_id = ?").run(req.params.id);
  db.prepare("DELETE FROM employee_master WHERE id = ? AND hospital_id = ?").run(req.params.id, req.user.hospital_id);
  res.json({ ok: true });
});

module.exports = router;
