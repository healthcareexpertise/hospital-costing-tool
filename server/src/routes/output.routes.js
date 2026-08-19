const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireDeptModule } = require("../middleware/rbac");
const { computeDepartmentOutput, computeProcedureOutput } = require("../engine/costEngine");

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

// Department output tab (Manpower/Material/Machinery/Expenses/Utilities/Total + line detail)
router.get("/:deptCode", resolveDeptAndProcedure, requireDeptModule("OUTPUT", "view"), (req, res) => {
  try {
    res.json(computeDepartmentOutput(req.proc.id, req.dept.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Department dashboard: same output, shaped for charts
router.get("/:deptCode/dashboard", resolveDeptAndProcedure, requireDeptModule("DASHBOARD", "view"), (req, res) => {
  try {
    res.json(computeDepartmentOutput(req.proc.id, req.dept.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
