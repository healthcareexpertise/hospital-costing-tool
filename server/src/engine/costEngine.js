const { db } = require("../db/db");

function getRates() {
  const rows = db.prepare("SELECT param_code, value FROM rate_tariff_master").all();
  const r = {};
  rows.forEach((x) => (r[x.param_code] = x.value));
  return r;
}

function getInput(procedureId, departmentId) {
  return db.prepare("SELECT * FROM department_input WHERE procedure_id = ? AND department_id = ?").get(procedureId, departmentId);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Depreciation + insurance + maintenance for one asset row, apportioned by the department's driver
function assetCostForCase(cost, usefulLife, noOfUnits, scrapPct, insurancePct, maintenancePct, input, rates) {
  const workingDays = input.standard_working_days_year || rates.STD_DAYS_YEAR;
  const scrap = cost * (scrapPct / 100);
  const annualDep = usefulLife > 0 ? ((cost - scrap) / usefulLife) * noOfUnits : 0;
  const depPerDay = annualDep / workingDays;
  const insurance = (cost * (insurancePct / 100) * noOfUnits) / workingDays;
  const maintenance = (cost * (maintenancePct / 100) * noOfUnits) / workingDays;
  const totalPerDay = depPerDay + insurance + maintenance;
  if (input.driver_hours != null) {
    const perHour = totalPerDay / (input.standard_hours_day || 8);
    return perHour * input.driver_hours;
  }
  return totalPerDay * (input.driver_days || 1);
}

function manpowerCostForCase(rateType, rateValue, noOfPersons, input) {
  if (rateType === "FEE_PER_SURGERY") return rateValue * (noOfPersons || 1); // flat fee per person, already per-surgery
  // Salaried: monthly gross -> per day -> per hour -> per case
  const monthly = rateValue * noOfPersons;
  const perDay = monthly / (input.standard_days_month || 22);
  if (input.driver_hours != null) {
    const perHour = perDay / (input.standard_hours_day || 8);
    return perHour * input.driver_hours;
  }
  return perDay * (input.driver_days || 1);
}

function computeFullDepartment(procedureId, departmentId) {
  const rates = getRates();
  const input = getInput(procedureId, departmentId);
  if (!input) throw new Error(`No department_input configured for procedure ${procedureId} / department ${departmentId}`);

  // A. Manpower
  const manpowerRows = db.prepare("SELECT * FROM manpower_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let manpower = 0;
  const manpowerDetail = manpowerRows.map((r) => {
    const val = manpowerCostForCase(r.rate_type, r.rate_value, r.no_of_persons, input);
    manpower += val;
    return { role: r.role, rate_type: r.rate_type, rate_value: r.rate_value, no_of_persons: r.no_of_persons, cost_for_case: round2(val) };
  });

  // B. Material
  const materialRows = db.prepare("SELECT * FROM materials_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let material = 0;
  const materialDetail = materialRows.map((r) => {
    const val = r.cost_price_per_unit * r.qty_per_patient;
    material += val;
    return { item: r.item_name, cost_price: r.cost_price_per_unit, qty: r.qty_per_patient, line_value: round2(val) };
  });

  // C. Machinery (equipment)
  const equipRows = db.prepare("SELECT * FROM equipment_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let machinery = 0;
  const equipDetail = equipRows.map((r) => {
    const val = assetCostForCase(r.cost_price, r.useful_life_years, r.no_of_units, r.scrap_pct, r.insurance_pct, r.maintenance_pct, input, rates);
    machinery += val;
    return { equipment: r.equipment_name, cost_price: r.cost_price, cost_for_case: round2(val) };
  });

  // D. Expenses (non-medical assets)
  const nmRows = db.prepare("SELECT * FROM nonmedical_asset_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let expenses = 0;
  const nmDetail = nmRows.map((r) => {
    const val = assetCostForCase(r.cost_price, r.useful_life_years, r.no_of_units, r.scrap_pct, 0, 0, input, rates);
    expenses += val;
    return { asset: r.asset_name, cost_price: r.cost_price, cost_for_case: round2(val) };
  });

  // E. Utilities: AC + Building + Power
  const acRows = db.prepare("SELECT * FROM ac_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let acCost = 0;
  const acDetail = acRows.map((r) => {
    const dep = assetCostForCase(r.capital_cost, r.useful_life_years, 1, r.scrap_pct, r.insurance_pct, r.maintenance_pct, input, rates);
    const powerLoadKw = r.odu_capacity_tr * rates.KW_PER_TON;
    const powerCostPerHour = powerLoadKw * rates.ELEC_RATE_AC;
    const powerForCase = input.driver_hours != null ? powerCostPerHour * input.driver_hours : powerCostPerHour * (input.driver_days || 1) * (input.standard_hours_day || 8);
    const total = dep + powerForCase;
    acCost += total;
    return { room: `${r.floor || ""} ${r.room || ""}`.trim(), capital_cost: r.capital_cost, cost_for_case: round2(total) };
  });

  const building = db.prepare("SELECT * FROM building_master WHERE department_id = ? AND procedure_id = ?").get(departmentId, procedureId);
  let buildingCost = 0;
  if (building && building.dept_building_value) {
    const annualDep = building.dept_building_value / (building.life_years || rates.BUILDING_LIFE_YEARS);
    const perDay = annualDep / 12 / (input.standard_days_month || 22);
    if (input.driver_hours != null) {
      buildingCost = (perDay / (input.standard_hours_day || 8)) * input.driver_hours;
    } else {
      buildingCost = perDay * (input.driver_days || 1);
    }
  }

  const powerRows = db.prepare("SELECT * FROM power_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let powerCost = 0;
  const powerDetail = powerRows.map((r) => {
    const perHour = r.power_kw * rates.ELEC_RATE_GENERAL;
    const val = input.driver_hours != null ? perHour * input.driver_hours : perHour * (input.standard_hours_day || 8) * (input.driver_days || 1);
    powerCost += val;
    return { equipment: r.equipment_name, power_kw: r.power_kw, cost_for_case: round2(val) };
  });

  const utilities = acCost + buildingCost + powerCost;
  const total = manpower + material + machinery + expenses + utilities;

  return {
    procedure_id: procedureId,
    department_id: departmentId,
    engine_type: "FULL",
    source: "computed",
    input,
    cost_heads: {
      manpower: round2(manpower),
      material: round2(material),
      machinery: round2(machinery),
      expenses: round2(expenses),
      utilities: round2(utilities),
      total: round2(total),
    },
    breakdown: {
      utilities_split: { ac: round2(acCost), building: round2(buildingCost), power: round2(powerCost) },
      manpower_detail: manpowerDetail,
      material_detail: materialDetail,
      equipment_detail: equipDetail,
      nonmedical_detail: nmDetail,
      ac_detail: acDetail,
      power_detail: powerDetail,
    },
  };
}

function computeSimpleDepartment(procedureId, departmentId) {
  const input = getInput(procedureId, departmentId);
  const rows = db.prepare("SELECT * FROM simple_asset_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId);
  let total = 0;
  const detail = [];
  for (const r of rows) {
    let val = 0;
    if (/cost per day per bed|cost per meal per day per bed/i.test(r.item_name || "")) {
      val = (r.cost_price || 0) * (input?.driver_days || 1);
    }
    detail.push({ item: r.item_name, value: r.cost_price, notes: r.notes });
  }
  return {
    procedure_id: procedureId,
    department_id: departmentId,
    engine_type: "SIMPLE",
    source: "computed",
    input,
    cost_heads: { manpower: 0, material: 0, machinery: 0, expenses: 0, utilities: 0, total: round2(total) },
    breakdown: { parameters: detail },
    note: "Simple departments store raw capex/opex parameters; wire in the department-specific formula (see documentation) to derive a per-case figure.",
  };
}

/**
 * Returns the cost breakdown for one (procedure, department) pair.
 * If a ground-truth row exists in procedure_department_reference (currently populated
 * for the Cardiology/Neurosurgery/Urology procedures, sourced directly from the
 * hospital's own procedure-level cost sheets), that reference figure is authoritative
 * for cost_heads/total. Master-data detail (if any exists for this procedure+department)
 * is still returned for display/editing, it just isn't re-summed into the total yet.
 * CABG has no reference rows, so it always uses the live formula engine above.
 */
function computeDepartmentOutput(procedureId, departmentId) {
  const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId);
  if (!dept) throw new Error("Department not found");

  const ref = db
    .prepare("SELECT * FROM procedure_department_reference WHERE procedure_id = ? AND department_id = ?")
    .get(procedureId, departmentId);

  if (ref) {
    const manpowerDetail = db.prepare("SELECT * FROM manpower_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId)
      .map((r) => ({ role: r.role, rate_type: r.rate_type, rate_value: r.rate_value, no_of_persons: r.no_of_persons, cost_for_case: round2(r.rate_value * (r.no_of_persons || 1)) }));
    const materialDetail = db.prepare("SELECT * FROM materials_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId)
      .map((r) => ({ item: r.item_name, cost_price: r.cost_price_per_unit, qty: r.qty_per_patient, line_value: round2(r.cost_price_per_unit * r.qty_per_patient) }));
    const equipDetail = db.prepare("SELECT * FROM equipment_master WHERE department_id = ? AND procedure_id = ?").all(departmentId, procedureId)
      .map((r) => ({ equipment: r.equipment_name, cost_price: r.cost_price, cost_for_case: null }));

    return {
      procedure_id: procedureId,
      department_id: departmentId,
      engine_type: dept.engine_type,
      source: "reference",
      input: getInput(procedureId, departmentId),
      cost_heads: {
        manpower: round2(ref.manpower), material: round2(ref.material), machinery: round2(ref.machinery),
        expenses: round2(ref.expenses), utilities: round2(ref.utilities), total: round2(ref.total),
      },
      breakdown: { manpower_detail: manpowerDetail, material_detail: materialDetail, equipment_detail: equipDetail },
      note: "Sourced directly from the hospital's procedure-level cost sheet (ground truth). Master-data rows above are supporting detail — editing them does not yet change this total.",
    };
  }

  return dept.engine_type === "FULL" ? computeFullDepartment(procedureId, departmentId) : computeSimpleDepartment(procedureId, departmentId);
}

/** Full package cost for one procedure: sums computeDepartmentOutput across every department that applies to it. */
function computeProcedureOutput(procedureId) {
  const proc = db.prepare("SELECT p.*, s.name as specialty_name, s.code as specialty_code FROM procedures p JOIN specialties s ON s.id = p.specialty_id WHERE p.id = ?").get(procedureId);
  if (!proc) throw new Error("Procedure not found");

  const refDeptIds = db.prepare("SELECT DISTINCT department_id FROM procedure_department_reference WHERE procedure_id = ?").all(procedureId).map((r) => r.department_id);
  const inputDeptIds = db.prepare("SELECT DISTINCT department_id FROM department_input WHERE procedure_id = ?").all(procedureId).map((r) => r.department_id);
  const deptIds = [...new Set([...refDeptIds, ...inputDeptIds])];

  const rows = deptIds.map((did) => {
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(did);
    const out = computeDepartmentOutput(procedureId, did);
    return { department_id: did, department: dept.name, ...out.cost_heads };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.manpower += r.manpower; acc.material += r.material; acc.machinery += r.machinery;
      acc.expenses += r.expenses; acc.utilities += r.utilities; acc.total += r.total;
      return acc;
    },
    { manpower: 0, material: 0, machinery: 0, expenses: 0, utilities: 0, total: 0 }
  );
  Object.keys(totals).forEach((k) => (totals[k] = round2(totals[k])));

  return { procedure: proc.name, procedure_code: proc.code, specialty: proc.specialty_name, specialty_code: proc.specialty_code, rows, totals };
}

/** Global dashboard: every procedure across every specialty, with its package cost. */
function computeGlobalDashboard(hospitalId) {
  const procs = db.prepare(
    "SELECT p.id, p.code, p.name, s.name as specialty, s.code as specialty_code, s.display_order FROM procedures p JOIN specialties s ON s.id = p.specialty_id WHERE p.hospital_id = ? ORDER BY s.display_order, p.name"
  ).all(hospitalId);

  const rows = procs.map((p) => {
    const out = computeProcedureOutput(p.id);
    return { procedure_code: p.code, procedure: p.name, specialty: p.specialty, specialty_code: p.specialty_code, ...out.totals };
  });

  const bySpecialty = {};
  rows.forEach((r) => {
    if (!bySpecialty[r.specialty]) bySpecialty[r.specialty] = { specialty: r.specialty, procedure_count: 0, total_cost: 0 };
    bySpecialty[r.specialty].procedure_count += 1;
    bySpecialty[r.specialty].total_cost += r.total;
  });
  Object.values(bySpecialty).forEach((s) => (s.total_cost = round2(s.total_cost)));

  return { rows, bySpecialty: Object.values(bySpecialty) };
}

module.exports = { computeDepartmentOutput, computeProcedureOutput, computeGlobalDashboard, computeTestDepartmentOutput };

/**
 * Lab/Radiology per-test costing. Returns every test in a department with its cost
 * broken into direct cost (reagent/consumable, or Radiology's fully-loaded technical
 * total), doctor's fee, and department-level overhead — computed both against "actual"
 * real test volume and "standard" rated machine capacity.
 */
function computeTestDepartmentOutput(departmentId) {
  const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(departmentId);
  if (!dept) throw new Error("Department not found");

  const testRows = db.prepare("SELECT * FROM test_master WHERE department_id = ? ORDER BY sl_no").all(departmentId);
  const overhead = db.prepare("SELECT * FROM test_overhead_master WHERE department_id = ?").get(departmentId);

  const ov = (k) => (overhead ? overhead[k] || 0 : 0);
  const overheadActualSum = ov("manpower_actual") + ov("equipment_actual") + ov("building_actual") + ov("power_actual") + ov("common_consumables_actual");
  const overheadStandardSum = ov("manpower_standard") + ov("equipment_standard") + ov("building_standard") + ov("power_standard") + ov("common_consumables_standard");

  const tests = testRows.map((t) => ({
    id: t.id, sl_no: t.sl_no, test_name: t.test_name,
    direct_cost: round2(t.direct_cost), doctor_fee: round2(t.doctor_fee),
    overhead_actual: round2(overheadActualSum), overhead_standard: round2(overheadStandardSum),
    total_actual: round2(t.direct_cost + t.doctor_fee + overheadActualSum),
    total_standard: round2(t.direct_cost + t.doctor_fee + overheadStandardSum),
  }));

  return {
    department_id: departmentId, department: dept.name, engine_type: "PER_TEST",
    overhead: overhead || null, test_count: tests.length, tests,
  };
}
