const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requireDeptModule } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

// table name + editable column list per master "type" query param
const TABLES = {
  manpower: { table: "manpower_master", cols: ["sl_no", "role", "category", "no_of_persons", "rate_type", "rate_value", "employee_id"] },
  materials: { table: "materials_master", cols: ["sl_no", "item_name", "cost_price_per_unit", "qty_per_patient"] },
  equipment: { table: "equipment_master", cols: ["sl_no", "equipment_name", "cost_price", "date_of_purchase", "useful_life_years", "no_of_units", "scrap_pct", "insurance_pct", "maintenance_pct"] },
  nonmedical: { table: "nonmedical_asset_master", cols: ["sl_no", "asset_name", "no_of_units", "cost_price", "useful_life_years", "scrap_pct"] },
  ac: { table: "ac_master", cols: ["sl_no", "floor", "room", "odu_capacity_tr", "capital_cost", "useful_life_years", "scrap_pct", "insurance_pct", "maintenance_pct"] },
  power: { table: "power_master", cols: ["sl_no", "equipment_name", "power_kw"] },
  building: { table: "building_master", cols: ["area_sqft", "cost_per_sqft", "dept_building_value", "life_years"], single: true },
  simple: { table: "simple_asset_master", cols: ["item_name", "cost_price", "useful_life_years", "amc_pct", "rate_per_bed_per_day", "notes"] },
};

// Resolves :deptCode from the path and a procedure from ?procedure=CODE (defaults to CABG)
function resolveDeptAndProcedure(req, res, next) {
  const dept = db.prepare("SELECT * FROM departments WHERE code = ?").get(req.params.deptCode);
  if (!dept) return res.status(404).json({ error: "Unknown department code" });
  const procCode = req.query.procedure || "CABG";
  const proc = db.prepare("SELECT * FROM procedures WHERE code = ?").get(procCode);
  if (!proc) return res.status(404).json({ error: `Unknown procedure code ${procCode}` });
  req.dept = dept;
  req.proc = proc;
  next();
}

// GET all master rows of a given type for a department + procedure
router.get("/:deptCode/:masterType", resolveDeptAndProcedure, requireDeptModule("MASTER", "view"), (req, res) => {
  const spec = TABLES[req.params.masterType];
  if (!spec) return res.status(404).json({ error: "Unknown master type" });
  if (spec.single) {
    const row = db.prepare(`SELECT * FROM ${spec.table} WHERE department_id = ? AND procedure_id = ?`).get(req.dept.id, req.proc.id);
    return res.json(row || null);
  }
  const rows = db.prepare(`SELECT * FROM ${spec.table} WHERE department_id = ? AND procedure_id = ? ORDER BY sl_no`).all(req.dept.id, req.proc.id);
  res.json(rows);
});

// POST create a new row (not applicable to single-row tables like building)
router.post("/:deptCode/:masterType", resolveDeptAndProcedure, requireDeptModule("MASTER", "edit"), (req, res) => {
  const spec = TABLES[req.params.masterType];
  if (!spec || spec.single) return res.status(400).json({ error: "Cannot create rows on this master type" });
  const cols = spec.cols.filter((c) => c in req.body);
  const placeholders = cols.map(() => "?").join(",");
  const stmt = db.prepare(
    `INSERT INTO ${spec.table} (department_id, procedure_id, ${cols.join(",")}) VALUES (?, ?, ${placeholders})`
  );
  const info = stmt.run(req.dept.id, req.proc.id, ...cols.map((c) => req.body[c]));
  res.status(201).json({ id: info.lastInsertRowid });
});

// PUT update the single row for a "single" master type (e.g. building)
router.put("/:deptCode/:masterType", resolveDeptAndProcedure, requireDeptModule("MASTER", "edit"), (req, res) => {
  const spec = TABLES[req.params.masterType];
  if (!spec) return res.status(404).json({ error: "Unknown master type" });
  if (!spec.single) return res.status(400).json({ error: "This master type requires an /:id" });
  const cols = spec.cols.filter((c) => c in req.body);
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  const existing = db.prepare(`SELECT id FROM ${spec.table} WHERE department_id = ? AND procedure_id = ?`).get(req.dept.id, req.proc.id);
  if (existing) {
    db.prepare(`UPDATE ${spec.table} SET ${setClause} WHERE department_id = ? AND procedure_id = ?`).run(...cols.map((c) => req.body[c]), req.dept.id, req.proc.id);
  } else {
    const allCols = ["department_id", "procedure_id", ...cols];
    db.prepare(`INSERT INTO ${spec.table} (${allCols.join(",")}) VALUES (${allCols.map(() => "?").join(",")})`).run(
      req.dept.id, req.proc.id, ...cols.map((c) => req.body[c])
    );
  }
  res.json({ ok: true });
});

// PUT update a row by id (multi-row master types)
router.put("/:deptCode/:masterType/:id", resolveDeptAndProcedure, requireDeptModule("MASTER", "edit"), (req, res) => {
  const spec = TABLES[req.params.masterType];
  if (!spec) return res.status(404).json({ error: "Unknown master type" });
  if (spec.single) return res.status(400).json({ error: "Use PUT without :id for this master type" });
  const cols = spec.cols.filter((c) => c in req.body);
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  db.prepare(`UPDATE ${spec.table} SET ${setClause} WHERE id = ? AND department_id = ? AND procedure_id = ?`).run(
    ...cols.map((c) => req.body[c]), req.params.id, req.dept.id, req.proc.id
  );
  res.json({ ok: true });
});

// DELETE a row by id
router.delete("/:deptCode/:masterType/:id", resolveDeptAndProcedure, requireDeptModule("MASTER", "edit"), (req, res) => {
  const spec = TABLES[req.params.masterType];
  if (!spec || spec.single) return res.status(400).json({ error: "Cannot delete this master type" });
  db.prepare(`DELETE FROM ${spec.table} WHERE id = ? AND department_id = ? AND procedure_id = ?`).run(req.params.id, req.dept.id, req.proc.id);
  res.json({ ok: true });
});

module.exports = router;
