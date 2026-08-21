const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireDeptModule } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

function resolveDeptAndProcedure(req, res, next) {
  const dept = db.prepare("SELECT * FROM departments WHERE code = ? AND hospital_id = ?").get(req.params.deptCode, req.user.hospital_id);
  if (!dept) return res.status(404).json({ error: "Unknown department code" });
  const procCode = req.query.procedure || "CABG";
  const proc = db.prepare("SELECT * FROM procedures WHERE code = ? AND hospital_id = ?").get(procCode, req.user.hospital_id);
  if (!proc) return res.status(404).json({ error: `Unknown procedure code ${procCode}` });
  req.dept = dept;
  req.proc = proc;
  next();
}

router.get("/:deptCode", resolveDeptAndProcedure, requireDeptModule("INPUT", "view"), (req, res) => {
  const row = db.prepare("SELECT * FROM department_input WHERE department_id = ? AND procedure_id = ?").get(req.dept.id, req.proc.id);
  const rateRows = db.prepare("SELECT param_code, value FROM rate_tariff_master WHERE hospital_id = ?").all(req.user.hospital_id);
  const rates = {};
  rateRows.forEach((r) => (rates[r.param_code] = r.value));
  const hospitalDefaults = {
    standard_working_days_year: rates.STD_DAYS_YEAR ?? 300,
    standard_days_month: rates.STD_DAYS_MONTH ?? 22,
    no_of_beds: rates.DEFAULT_BEDS ?? 100,
  };
  const procDefault = db.prepare("SELECT * FROM procedure_default_driver WHERE procedure_id = ?").get(req.proc.id);
  res.json({
    ...row,
    department_driver_type: req.dept.driver_type,
    procedure_default_hours: procDefault?.default_hours ?? null,
    procedure_default_days: procDefault?.default_days ?? null,
    hospital_defaults: hospitalDefaults,
  });
});

router.put("/:deptCode", resolveDeptAndProcedure, requireDeptModule("INPUT", "edit"), (req, res) => {
  const { driver_hours, driver_days, standard_working_days_year, standard_days_month, standard_hours_day, no_of_beds } = req.body;
  const existing = db.prepare("SELECT id FROM department_input WHERE department_id = ? AND procedure_id = ?").get(req.dept.id, req.proc.id);
  if (existing) {
    db.prepare(
      `UPDATE department_input SET driver_hours=?, driver_days=?, standard_working_days_year=?, standard_days_month=?, standard_hours_day=?, no_of_beds=? WHERE department_id=? AND procedure_id=?`
    ).run(driver_hours, driver_days, standard_working_days_year, standard_days_month, standard_hours_day, no_of_beds, req.dept.id, req.proc.id);
  } else {
    db.prepare(
      `INSERT INTO department_input (department_id, procedure_id, driver_hours, driver_days, standard_working_days_year, standard_days_month, standard_hours_day, no_of_beds) VALUES (?,?,?,?,?,?,?,?)`
    ).run(req.dept.id, req.proc.id, driver_hours, driver_days, standard_working_days_year, standard_days_month, standard_hours_day, no_of_beds);
  }
  res.json({ ok: true });
});

module.exports = router;
