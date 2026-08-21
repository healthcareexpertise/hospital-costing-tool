const { db, isNew } = require("./db");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "seed_data", name), "utf8"));
}

// Map the extracted-file department labels onto our canonical Department Master codes/names
const DEPT_NAME_MAP = {
  "OT": "OT", "ICU": "ICU", "Laboratory": "LAB", "Radiology": "RADIOLOGY",
  "Physiotherapy": "PHYSIOTHERAPHY", "Blood Bank": "BLOOD BANK", "Pharmacy": "PHARMACY",
  "Ward": "WARD", "CSSD": "CSSD", "IT": "IT", "CCTV": "CCTV", "Fire safety": "FIRESAFETY",
  "Operations & Admin": "OPERATIONS & ADMIN", "Finance & Accounts": "FINANCE & ACCOUNTS",
  "Purchase & Stores": "PURCHASE & STORES", "HR": "HR", "Maintenance": "MAINTENANCE",
  "MRD": "MRD", "Admission": "ADMISSIONS", "Security": "SECURITY", "Housekeeping": "HOUSE KEEPING",
  "Communication": "COMMUNICATION", "Non Medical furniture (Indirect)": "NON MEDICAL FURNITURE(INDIRECT)",
};

const DEPARTMENTS = [
  ["OT", "OT", "Medical Support", "FULL", "HOURS", 1],
  ["ICU", "ICU", "Medical Support", "FULL", "DAYS", 2],
  ["LAB", "LAB", "Medical Support", "FULL", "HOURS", 3],
  ["RADIOLOGY", "RADIOLOGY", "Medical Support", "FULL", "HOURS", 4],
  ["PHYSIOTHERAPHY", "PHYSIOTHERAPHY", "Medical Support", "FULL", "HOURS", 5],
  ["BLOOD BANK", "BLOOD BANK", "Medical Support", "FULL", "HOURS", 6],
  ["PHARMACY", "PHARMACY", "Medical Support", "FULL", "HOURS", 7],
  ["WARD", "WARD", "Medical Support", "FULL", "DAYS", 8],
  ["CSSD", "CSSD", "Service", "FULL", "HOURS", 9],
  ["IT", "IT", "Service", "FULL", "DAYS", 10],
  ["CCTV", "CCTV", "Service", "FULL", "DAYS", 11],
  ["FIRESAFETY", "FIRE SAFETY", "Service", "FULL", "DAYS", 12],
  ["OPS_ADMIN", "OPERATIONS & ADMIN", "Service", "FULL", "DAYS", 13],
  ["FINANCE", "FINANCE & ACCOUNTS", "Service", "FULL", "DAYS", 14],
  ["PURCHASE", "PURCHASE & STORES", "Service", "FULL", "DAYS", 15],
  ["HR", "HR", "Service", "FULL", "DAYS", 16],
  ["MAINTENANCE", "MAINTENANCE", "Service", "FULL", "DAYS", 17],
  ["MRD", "MRD", "Service", "FULL", "DAYS", 18],
  ["ADMISSIONS", "ADMISSIONS", "Service", "FULL", "DAYS", 19],
  ["SECURITY", "SECURITY", "Service", "FULL", "DAYS", 20],
  ["DIETICS", "DIETICS", "Service", "SIMPLE", "DAYS", 21],
  ["HOUSEKEEPING", "HOUSE KEEPING", "Service", "FULL", "DAYS", 22],
  ["LAUNDRY", "LAUNDRY & LINEN", "Service", "SIMPLE", "DAYS", 23],
  ["BUILDING_COST", "BUILDING COST", "Other Costs", "SIMPLE", "DAYS", 24],
  ["COMMUNICATION", "COMMUNICATION", "Other Costs", "FULL", "DAYS", 25],
  ["GENSET", "GENSET POWER BACK UP", "Other Costs", "SIMPLE", "HOURS", 26],
  ["BIOMED_WASTE", "BIOMEDICAL WASTE (OUT SOURCED)", "Other Costs", "SIMPLE", "DAYS", 27],
  ["NONMED_INDIRECT", "NON MEDICAL FURNITURE(INDIRECT)", "Other Costs", "FULL", "DAYS", 28],
  ["BIOMETRIC", "BIO METRIC", "Other Costs", "SIMPLE", "DAYS", 29],
  ["SOLAR", "SOLAR HEATING", "Other Costs", "SIMPLE", "DAYS", 30],
  ["UPS", "UPS", "Other Costs", "SIMPLE", "DAYS", 31],
  ["WATER", "WATER FACILITIES", "Other Costs", "SIMPLE", "DAYS", 32],
  ["BOSCH", "BOSCH (NURSE CALL/PA SYSTEM)", "Other Costs", "SIMPLE", "DAYS", 33],
  ["ADMINISTRATION", "HOSPITAL ADMINISTRATION", "Service", "FULL", "DAYS", 34],
  ["AC_DEPT", "AC", "Other Costs", "SIMPLE", "DAYS", 35],
];

const MODULE_TYPES = [
  ["MASTER", "Master"], ["INPUT", "Input"], ["OUTPUT", "Output"], ["DASHBOARD", "Dashboard"],
];

const SYSTEM_MODULES = [
  ["SYS_GLOBAL_DASHBOARD", "Global Cost Dashboard (Top Sheet)"],
  ["SYS_DEPARTMENT_MASTER", "Department Master"],
  ["SYS_PROFILE_MASTER", "Profile Master (Role & Module Permissions)"],
  ["SYS_USER_MASTER", "User Master"],
  ["SYS_RATE_TARIFF_MASTER", "Rate & Tariff Master"],
  ["SYS_ALLOCATION_BASIS_MASTER", "Allocation Basis Master"],
  ["SYS_SPECIALTY_MASTER", "Specialty Master"],
  ["SYS_PROCEDURE_MASTER", "Procedure (Surgery) Master"],
  ["SYS_EMPLOYEE_MASTER", "Employee Master"],
  ["SYS_RATE_TYPE_MASTER", "Rate Type Master"],
  ["SYS_HOSPITAL_PROFILE", "Hospital Profile"],
];

// ============================================================
// New specialties (Cardiology, Neurosurgery, Urology) — procedure-level
// cost sheets. Output totals come from ground-truth procedure_department_reference
// (taken directly from the hospital's own procedure top-sheets); the master-data
// tables below are supporting/editable detail, not (yet) wired to re-derive the total.
// ============================================================
const NEWDATA_DEPT_CODE_MAP = { AC: "AC_DEPT" }; // identity for everything else

const TOPSHEET_DEPT_NAME_TO_CODE = {
  "ot": "OT", "icu": "ICU", "pharmacy": "PHARMACY", "ward": "WARD", "cssd": "CSSD",
  "it": "IT", "cctv": "CCTV", "firesafety": "FIRESAFETY", "operations": "OPS_ADMIN",
  "finance & accounts": "FINANCE", "purchase & stores": "PURCHASE", "hr": "HR", "mrd": "MRD",
  "hospital administration": "ADMINISTRATION", "security": "SECURITY", "non medical asset": "NONMED_INDIRECT",
  "house keeping": "HOUSEKEEPING", "ac": "AC_DEPT", "biomedical and maintenance": "MAINTENANCE",
  "laundry & linen": "LAUNDRY", "water consumption": "WATER", "bosch cost": "BOSCH",
};

function normHeader(h) {
  return String(h || "").replace(/\s+/g, " ").trim().toLowerCase();
}
function getFuzzy(row, headers, candidates) {
  const normMap = {};
  headers.forEach((h) => (normMap[normHeader(h)] = h));
  for (const cand of candidates) {
    const c = normHeader(cand);
    if (normMap[c] !== undefined) return row[normMap[c]];
    for (const nh of Object.keys(normMap)) {
      if (nh.includes(c)) return row[normMap[nh]];
    }
  }
  return null;
}
function slugify(s) {
  return String(s).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function seedNewSpecialties(hospitalId, deptIdByName, specialtyIdByCode, deptIdByCode) {
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const topsheets = loadJSON("topsheets.json");
  const masterBlocks = loadJSON("new_specialty_master_data.json");
  const kvBlocks = loadJSON("new_specialty_kv_data.json");

  const insertProcedure = db.prepare(`INSERT OR IGNORE INTO procedures (hospital_id, specialty_id, code, name) VALUES (?,?,?,?)`);
  const insertRef = db.prepare(
    `INSERT OR REPLACE INTO procedure_department_reference (procedure_id, department_id, manpower, material, machinery, expenses, utilities, total)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const insertInput = db.prepare(
    `INSERT OR IGNORE INTO department_input (department_id, procedure_id, driver_hours, driver_days, standard_hours_day)
     VALUES (?,?,?,?,8)`
  );

  const procIdByKey = {}; // "SPECIALTY|ProcedureName" -> procedure id

  for (const [specialtyCode, procs] of Object.entries(topsheets)) {
    const specialtyId = specialtyIdByCode[specialtyCode];
    if (!specialtyId) continue;
    for (const [procName, data] of Object.entries(procs)) {
      if (!data) continue;
      const code = `${specialtyCode}_${slugify(procName)}`;
      insertProcedure.run(hospitalId, specialtyId, code, procName.trim());
      const procId = db.prepare("SELECT id FROM procedures WHERE code = ?").get(code).id;
      procIdByKey[`${specialtyCode}|${procName}`] = procId;

      const deptsUsed = [];
      for (const row of data.rows) {
        const deptCode = TOPSHEET_DEPT_NAME_TO_CODE[normHeader(row.department)];
        if (!deptCode || !deptIdByCode[deptCode]) continue;
        const deptId = deptIdByCode[deptCode];
        deptsUsed.push(deptId);
        insertRef.run(
          procId, deptId,
          num(row.MANPOWER) || 0, num(row.MATERIAL) || 0, num(row.MACHINERY) || 0,
          num(row.EXPENSES) || 0, num(row.UTILITIES) || 0, num(row.TOTAL) || 0
        );
      }
      // seed a default Input row for every department this procedure touches, so
      // the Input screen has something to show/edit even though Output currently
      // reads from the ground-truth reference table above
      for (const deptId of deptsUsed) {
        insertInput.run(deptId, procId);
      }
    }
  }

  // ---- Master-data detail (manpower/materials/equipment) for these procedures ----
  const insMP2 = db.prepare(`INSERT INTO manpower_master (department_id, procedure_id, sl_no, role, category, no_of_persons, rate_type, rate_value) VALUES (?,?,?,?,?,?,?,?)`);
  const insMT2 = db.prepare(`INSERT INTO materials_master (department_id, procedure_id, sl_no, item_name, cost_price_per_unit, qty_per_patient) VALUES (?,?,?,?,?,?)`);
  const insEQ2 = db.prepare(`INSERT INTO equipment_master (department_id, procedure_id, sl_no, equipment_name, cost_price, date_of_purchase, useful_life_years, no_of_units, scrap_pct, insurance_pct, maintenance_pct) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  let mpCount = 0, mtCount = 0, eqCount = 0;
  for (const block of masterBlocks) {
    const key = `${block.specialty}|${block.procedure}`;
    const procId = procIdByKey[key];
    if (!procId) continue;
    const deptCode = NEWDATA_DEPT_CODE_MAP[block.department] || block.department;
    const deptId = deptIdByCode[deptCode];
    if (!deptId) continue;

    if (block.master_type === "manpower") {
      for (const row of block.rows) {
        const role = getFuzzy(row, block.headers, ["particulars", "alos in ward"]);
        if (!role || typeof role !== "string" || /^(total|sub\s*total|grand\s*total)\b/i.test(role.trim())) continue;
        const total = num(getFuzzy(row, block.headers, ["total"]));
        const slNo = num(getFuzzy(row, block.headers, ["sl. no", "sl.no"]));
        insMP2.run(deptId, procId, slNo, role, null, 1, "FEE_PER_SURGERY", total || 0);
        mpCount++;
      }
    } else if (block.master_type === "materials") {
      for (const row of block.rows) {
        const name = getFuzzy(row, block.headers, ["name of the material"]);
        if (!name || typeof name !== "string" || /^(total|sub\s*total|grand\s*total)\b/i.test(name.trim())) continue;
        const price = num(getFuzzy(row, block.headers, ["cost price per unit"]));
        const qty = num(getFuzzy(row, block.headers, ["no of qty", "qty"]));
        if (price === null) continue;
        const slNo = num(getFuzzy(row, block.headers, ["sl.no", "sl. no"]));
        insMT2.run(deptId, procId, slNo, name, price, qty || 1);
        mtCount++;
      }
    } else if (block.master_type === "equipment") {
      for (const row of block.rows) {
        const name = getFuzzy(row, block.headers, ["name of the equipment"]);
        if (!name || typeof name !== "string" || /^(total|sub\s*total|grand\s*total)\b/i.test(name.trim())) continue;
        const cost = num(getFuzzy(row, block.headers, ["cost price"]));
        if (cost === null) continue;
        const slNo = num(getFuzzy(row, block.headers, ["sl.no", "sl. no"]));
        const life = num(getFuzzy(row, block.headers, ["average", "life-time"])) || 7;
        insEQ2.run(deptId, procId, slNo, name, cost, String(getFuzzy(row, block.headers, ["date of purchase"]) || ""), life, 1, 5, 1, 10);
        eqCount++;
      }
    }
  }

  // ---- Building/Power key-value detail ----
  const insBld2 = db.prepare(`INSERT OR REPLACE INTO building_master (department_id, procedure_id, area_sqft, cost_per_sqft, dept_building_value, life_years) VALUES (?,?,?,?,?,?)`);
  const insPW2 = db.prepare(`INSERT INTO power_master (department_id, procedure_id, sl_no, equipment_name, power_kw) VALUES (?,?,?,?,?)`);
  function kvGet(fields, candidates) {
    const norm = {};
    Object.keys(fields).forEach((k) => (norm[normHeader(k)] = fields[k]));
    for (const cand of candidates) {
      const c = normHeader(cand);
      if (norm[c] !== undefined) return norm[c];
      for (const nk of Object.keys(norm)) if (nk.includes(c)) return norm[nk];
    }
    return null;
  }
  let bldCount = 0;
  for (const block of kvBlocks) {
    const key = `${block.specialty}|${block.procedure}`;
    const procId = procIdByKey[key];
    if (!procId) continue;
    const deptCode = NEWDATA_DEPT_CODE_MAP[block.department] || block.department;
    const deptId = deptIdByCode[deptCode];
    if (!deptId) continue;
    if (block.master_type === "building") {
      const value = num(kvGet(block.fields, ["total pop cost", "total cost of the building"]));
      const area = num(kvGet(block.fields, ["specific areas", "area for"]));
      const rate = num(kvGet(block.fields, ["cost per square feet"]));
      const life = num(kvGet(block.fields, ["life of the asset"])) || 30;
      if (value === null && area === null) continue;
      insBld2.run(deptId, procId, area || 0, rate || 0, value || 0, life);
      bldCount++;
    }
  }

  console.log("New-specialty procedures inserted:", Object.keys(procIdByKey).length);
  console.log("  manpower:", mpCount, " materials:", mtCount, " equipment:", eqCount, " building:", bldCount);
}

// ============================================================
// Lab & Radiology per-test costing (fundamentally different model — see schema.sql).
// ============================================================
// Just 2 top-level departments now — Laboratory and Radiology — instead of 9 separate
// ones. Each groups its tests by "sub_department" (Biochemistry, Haematology, X-Ray,
// CT, ...) as a field on test_master/test_overhead_master rather than as a whole
// separate department, so the sidebar/permissions stay simple while the underlying
// costing still tracks each sub-department's own overhead accurately.
const LAB_RAD_DEPARTMENTS = [
  ["LABORATORY", "LABORATORY", "Medical Support", "PER_TEST", "DAYS", 40],
  ["RADIOLOGY", "RADIOLOGY", "Medical Support", "PER_TEST", "DAYS", 41],
];
const LAB_SUB_DEPTS = ["Biochemistry", "Haematology", "Clinical Pathology", "Microbiology", "Blood Bank"];
const RAD_SUB_DEPTS = ["X-Ray", "CT", "MRI", "USG / Doppler"];

function seedLabRadiology(hospitalId) {
  const insertDept = db.prepare(`INSERT OR IGNORE INTO departments (hospital_id, code, name, classification, engine_type, driver_type, display_order) VALUES (?,?,?,?,?,?,?)`);
  LAB_RAD_DEPARTMENTS.forEach((d) => insertDept.run(hospitalId, ...d));

  const deptIdByCode = {};
  for (const row of db.prepare("SELECT id, code FROM departments WHERE hospital_id = ?").all(hospitalId)) deptIdByCode[row.code] = row.id;

  // Auto-create the 4 standard modules for each new department + grant Admin full access
  const insertModule = db.prepare(`INSERT OR IGNORE INTO modules (code, name, module_type, department_id) VALUES (?,?,?,?)`);
  const adminProfile = db.prepare("SELECT id FROM profiles WHERE name = 'Admin' AND hospital_id = ?").get(hospitalId);
  const setPerm = db.prepare(`INSERT OR REPLACE INTO profile_module_permissions (profile_id, module_id, can_view, can_edit) VALUES (?,?,1,1)`);
  for (const [code, name] of LAB_RAD_DEPARTMENTS.map((d) => [d[0], d[1]])) {
    const deptId = deptIdByCode[code];
    for (const [type, label] of [["MASTER", "Master"], ["INPUT", "Input"], ["OUTPUT", "Output"], ["DASHBOARD", "Dashboard"]]) {
      insertModule.run(`H${hospitalId}_${code}_${type}`, `${name} - ${label}`, type, deptId);
    }
    if (adminProfile) {
      db.prepare("SELECT id FROM modules WHERE department_id = ?").all(deptId).forEach((m) => setPerm.run(adminProfile.id, m.id));
    }
  }

  const testCount = db.prepare("SELECT COUNT(*) c FROM test_master tm JOIN departments d ON d.id = tm.department_id WHERE d.hospital_id = ?").get(hospitalId).c;
  if (testCount === 0) {
    seedLabRadiologyTests(hospitalId, deptIdByCode);
    seedReagentsAndEquipment(hospitalId, deptIdByCode);
    seedTestManpower(hospitalId, deptIdByCode);
  }
  seedLabRadiologyOverhead(hospitalId, deptIdByCode);
}

// The test rows (names + direct costs), tagged with sub_department — NOT safe to re-run
// once populated (plain INSERT, would duplicate). Only called when this hospital has
// zero Lab/Radiology tests yet.
function seedLabRadiologyTests(hospitalId, deptIdByCode) {
  const insTest = db.prepare(`INSERT INTO test_master (department_id, sub_department, sl_no, test_name, direct_cost, doctor_fee, notes) VALUES (?,?,?,?,?,?,?)`);
  const labDeptId = deptIdByCode["LABORATORY"];
  const radDeptId = deptIdByCode["RADIOLOGY"];

  const labTests = loadJSON("lab_tests.json");
  const LAB_DEPT_MAP = { LAB_BIOCHEM: "Biochemistry", LAB_HAEM: "Haematology", LAB_CLINPATH: "Clinical Pathology", LAB_MICRO: "Microbiology" };
  for (const [code, subDept] of Object.entries(LAB_DEPT_MAP)) {
    labTests.filter((t) => t.department === code).forEach((t) => insTest.run(labDeptId, subDept, t.sl_no, t.test_name, t.direct_cost || 0, 0, null));
  }

  const bloodbank = loadJSON("bloodbank.json");
  bloodbank.tests.forEach((t) => insTest.run(labDeptId, "Blood Bank", t.sl_no, t.test_name, t.reagent_cost || 0, 0, null));

  const radTests = loadJSON("radiology_tests.json");
  const RAD_DEPT_MAP = { RAD_XRAY: "X-Ray", RAD_CT: "CT", RAD_MRI: "MRI", RAD_USG: "USG / Doppler" };
  for (const [code, subDept] of Object.entries(RAD_DEPT_MAP)) {
    radTests.filter((t) => t.department === code).forEach((t, i) => insTest.run(radDeptId, subDept, i + 1, t.test_name, t.direct_cost || 0, t.doctor_fee || 0, null));
  }
}

// Reagent (kit cost ÷ tests per kit) and Equipment registers, linked to their matching
// test rows by name where possible so the Test Master shows the mapping directly.
function seedReagentsAndEquipment(hospitalId, deptIdByCode) {
  const labDeptId = deptIdByCode["LABORATORY"];
  const insReagent = db.prepare(`INSERT INTO reagent_master (department_id, sub_department, item_name, kit_cost, tests_per_kit, notes) VALUES (?,?,?,?,?,?)`);
  const insEquip = db.prepare(`INSERT INTO test_equipment_master (department_id, sub_department, equipment_name, cost_price, life_years, notes) VALUES (?,?,?,?,?,?)`);
  const linkReagent = db.prepare(`UPDATE test_master SET reagent_id = ? WHERE department_id = ? AND sub_department = ? AND test_name = ?`);

  const reagents = loadJSON("lab_reagents.json");
  reagents.forEach((r) => {
    const info = insReagent.run(labDeptId, r.sub_department, r.test_name, r.kit_cost, r.tests_per_kit, `Cost per test = kit cost ÷ tests per kit = ${(r.kit_cost / r.tests_per_kit).toFixed(2)}`);
    linkReagent.run(info.lastInsertRowid, labDeptId, r.sub_department, r.test_name);
  });

  const equipment = loadJSON("lab_equipment_register.json");
  equipment.forEach((e) => insEquip.run(labDeptId, e.sub_department, e.equipment_name, e.cost_price, e.life_years, null));
}

// Manpower roster per sub-department — editable, linkable to Employee Master. Biochemistry/
// Haematology/Clinical Pathology/Microbiology each get their own copy of the same shared
// staff list from the source (which treats Lab manpower as one pool, not sub-department
// specific) so each can be customized independently going forward; Blood Bank gets its own
// distinct, much smaller staff line since its source figures are clearly a separate pool.
function seedTestManpower(hospitalId, deptIdByCode) {
  const labDeptId = deptIdByCode["LABORATORY"];
  const insManpower = db.prepare(`INSERT INTO test_manpower_master (department_id, sub_department, sl_no, designation, no_of_persons, monthly_salary, notes) VALUES (?,?,?,?,?,?,?)`);

  const labManpower = loadJSON("lab_manpower.json");
  const labPower = loadJSON("lab_power.json");
  const labActualVolume = 1036440 / labPower.actual;
  const DOCTORS_PER_TEST_ACTUAL = 4.17330952645083; // embedded lab-wide constant from the source (see README caveat)
  const doctorsMonthlySalaryEquivalent = (DOCTORS_PER_TEST_ACTUAL * labActualVolume) / 12;

  const LAB_SUB_DEPTS_SHARED = ["Biochemistry", "Haematology", "Clinical Pathology", "Microbiology"];
  for (const subDept of LAB_SUB_DEPTS_SHARED) {
    let sl = 1;
    labManpower.forEach((m) => {
      if (typeof m.annual_salary !== "number") return;
      const persons = m.no_of_persons || 1;
      insManpower.run(labDeptId, subDept, sl++, m.designation, persons, m.annual_salary / 12 / persons,
        "Part of the Lab-wide shared staff pool from the source data — the same roster is duplicated into every Lab sub-department so each can be customized independently.");
    });
    insManpower.run(labDeptId, subDept, sl++, "Pathologist / Doctor (professional fee pool)", 1, doctorsMonthlySalaryEquivalent,
      "Represents the lab-wide doctor's fee constant from the source data, expressed as an equivalent monthly figure — see README caveat on this simplification.");
  }

  // Blood Bank: its own much smaller, separate manpower figure (per-test rate converted to a
  // monthly-equivalent single line, since the source gives it directly rather than a roster).
  const bloodbank = loadJSON("bloodbank.json");
  const bbMonthlyEquivalent = (bloodbank.overhead.manpower_actual * 1) / 12; // actual_volume is normalized to 1 for Blood Bank
  insManpower.run(labDeptId, "Blood Bank", 1, "Blood Bank staff (combined)", 1, bbMonthlyEquivalent,
    "Blood Bank's manpower is a separate, smaller pool from the other Lab sub-departments — the source gives it as a direct per-test rate rather than an itemized roster, so it's represented here as one combined line.");
}

// The overhead constants (annual totals + volume) per (department, sub_department) —
// safe to re-run any time (INSERT OR REPLACE, keyed by department_id+sub_department).
function seedLabRadiologyOverhead(hospitalId, deptIdByCode) {
  const insOverhead = db.prepare(
    `INSERT OR REPLACE INTO test_overhead_master (department_id, sub_department, equipment_annual_total, building_annual_total, power_annual_total, common_consumables_annual_total, actual_volume, standard_volume, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  const labDeptId = deptIdByCode["LABORATORY"];
  const radDeptId = deptIdByCode["RADIOLOGY"];

  // ---- Lab: Biochemistry, Haematology, Clinical Pathology, Microbiology ----
  const labBuilding = loadJSON("lab_building.json");
  const labPower = loadJSON("lab_power.json");
  const labEquipment = loadJSON("lab_equipment.json");

  // actual/standard lab-wide test volume, back-derived from the source's own power-cost-per-test figures
  // (per-year power cost / per-test power cost = test volume) — cross-validated against the embedded
  // Biochemistry manpower constant in lab_tests.json, which matches to 6 significant figures.
  const labActualVolume = 1036440 / labPower.actual;
  const labStandardVolume = 1036440 / labPower.standard;

  const LAB_DEPT_MAP = { LAB_BIOCHEM: "Biochemistry", LAB_HAEM: "Haematology", LAB_CLINPATH: "Clinical Pathology", LAB_MICRO: "Microbiology" };
  const LAB_EQUIP_LOC_MAP = { LAB_BIOCHEM: "LAB- BIOCHEMISTRY", LAB_HAEM: "LAB- HAEMATOLOGY", LAB_CLINPATH: "LAB- CLINICAL PATHOLOGY", LAB_MICRO: "LAB- MICROBIOLOGY" };
  const LAB_BUILDING_KEY = { LAB_BIOCHEM: "Biochemistry", LAB_HAEM: "Haematology", LAB_CLINPATH: "Clinical pathology", LAB_MICRO: "Microbiology" };

  for (const code of Object.keys(LAB_DEPT_MAP)) {
    const subDept = LAB_DEPT_MAP[code];
    const bld = labBuilding[LAB_BUILDING_KEY[code]] || {};
    const equipLoc = LAB_EQUIP_LOC_MAP[code];
    const equipRows = labEquipment.filter((e) => e.location.toUpperCase() === equipLoc.toUpperCase());
    // Reconstruct each sub-department's raw annual equipment/building totals from the source's
    // own pre-computed per-test rate × the lab-wide volume it was divided by (recovers the exact
    // original total, since that IS how the source arrived at the per-test rate in the first place).
    const equipAnnualTotal = equipRows.reduce((s, e) => s + (e.per_test_actual || 0), 0) * labActualVolume;
    const buildingAnnualTotal = (bld.cost_per_test_actual || 0) * labActualVolume;
    const powerAnnualTotal = 1036440; // lab-wide raw annual power cost, given directly in the source

    insOverhead.run(
      labDeptId, subDept,
      equipAnnualTotal, buildingAnnualTotal, powerAnnualTotal, 0,
      labActualVolume, labStandardVolume,
      "Manpower is computed live from the Manpower Master roster on this sub-department's own tab, not stored here. Equipment and Building totals are specific to this sub-department, reconstructed from the source's per-test rate × lab-wide volume. Edit the annual totals and/or actual/standard volume below to recalculate for a different hospital."
    );
  }

  // ---- Blood Bank (its own sub-department within Laboratory) ----
  const bloodbank = loadJSON("bloodbank.json");
  const bbEquipStdRatio = bloodbank.overhead.equipment_standard ? bloodbank.overhead.equipment_actual / bloodbank.overhead.equipment_standard : 10;
  insOverhead.run(
    labDeptId, "Blood Bank",
    bloodbank.overhead.equipment_actual, bloodbank.overhead.building_actual,
    bloodbank.overhead.power_actual, bloodbank.overhead.common_consumables_actual,
    1, bbEquipStdRatio,
    "Manpower is computed live from the Manpower Master roster on this sub-department's own tab, not stored here. Volume is normalized to 1 for 'actual' since the source gives Blood Bank's overhead as direct per-test rates rather than a separate total/volume pair. 'Standard' volume approximates the actual/standard ratio observed in Blood Bank's own equipment figures, since the source doesn't give a Blood-Bank-specific standard test volume directly."
  );

  // Radiology sub-departments have no overhead row: their "direct_cost" is the source's own
  // fully-loaded "Total cost per test" figure (technical costs — manpower/equipment/building/
  // power — already baked in); only the doctor's fee is added on top — see costEngine.js.

  console.log("Lab/Radiology overhead seeded for hospital", hospitalId);
}

function run() {
  // ---- Hospital (multi-tenancy root) ----
  const insertHospital = db.prepare(
    `INSERT OR IGNORE INTO hospitals (code, name, address, city, state, bed_count) VALUES (?,?,?,?,?,?)`
  );
  insertHospital.run("BMH", "Baby Memorial Hospital", null, "Kozhikode", "Kerala", 351);
  const hospitalId = db.prepare("SELECT id FROM hospitals WHERE code = 'BMH'").get().id;

  // Platform admin: manages the hospitals list itself, not tied to any one hospital
  const insertPlatformAdmin = db.prepare(
    `INSERT OR IGNORE INTO users (hospital_id, username, password_hash, full_name, profile_id, is_platform_admin) VALUES (NULL,?,?,?,NULL,1)`
  );
  insertPlatformAdmin.run("platform.admin", bcrypt.hashSync("password123", 8), "Platform Administrator");

  // ---- Specialties & Procedures ----
  const insertSpecialty = db.prepare(`INSERT OR IGNORE INTO specialties (hospital_id, code, name, display_order) VALUES (?,?,?,?)`);
  const SPECIALTIES = [
    ["CTVS", "Cardiothoracic & Vascular Surgery", 1],
    ["CARDIO", "Cardiology", 2],
    ["NEUROSURG", "Neurosurgery", 3],
    ["URO", "Urology", 4],
  ];
  SPECIALTIES.forEach(([code, name, order]) => insertSpecialty.run(hospitalId, code, name, order));
  const specialtyIdByCode = Object.fromEntries(
    db.prepare("SELECT id, code FROM specialties WHERE hospital_id = ?").all(hospitalId).map((r) => [r.code, r.id])
  );

  const insertProcedure = db.prepare(`INSERT OR IGNORE INTO procedures (hospital_id, specialty_id, code, name) VALUES (?,?,?,?)`);
  insertProcedure.run(hospitalId, specialtyIdByCode["CTVS"], "CABG", "CABG (On-Pump)");
  const cabgProcId = db.prepare("SELECT id FROM procedures WHERE code = 'CABG' AND hospital_id = ?").get(hospitalId).id;

  const insertDept = db.prepare(
    `INSERT OR IGNORE INTO departments (hospital_id, code, name, classification, engine_type, driver_type, display_order)
     VALUES (?,?,?,?,?,?,?)`
  );
  const deptIdByName = {};
  for (const [code, name, classification, engine, driver, order] of DEPARTMENTS) {
    insertDept.run(hospitalId, code, name, classification, engine, driver, order);
  }
  for (const row of db.prepare("SELECT id, name FROM departments WHERE hospital_id = ?").all(hospitalId)) {
    deptIdByName[row.name] = row.id;
  }
  const deptIdByCode = {};
  for (const row of db.prepare("SELECT id, code FROM departments WHERE hospital_id = ?").all(hospitalId)) {
    deptIdByCode[row.code] = row.id;
  }

  // ---- Modules: 4 per department + system modules ----
  const insertModule = db.prepare(
    `INSERT OR IGNORE INTO modules (code, name, module_type, department_id) VALUES (?,?,?,?)`
  );
  for (const [code, name, classification, engine, driver, order] of DEPARTMENTS) {
    const deptId = deptIdByName[name];
    for (const [type, label] of MODULE_TYPES) {
      insertModule.run(`${code}_${type}`, `${name} - ${label}`, type, deptId);
    }
  }
  for (const [code, name] of SYSTEM_MODULES) {
    insertModule.run(code, name, "SYSTEM", null);
  }

  // ---- Profiles ----
  const insertProfile = db.prepare(
    `INSERT OR IGNORE INTO profiles (hospital_id, name, description, is_system) VALUES (?,?,?,?)`
  );
  insertProfile.run(hospitalId, "Admin", "Full access to every module (view + edit)", 1);
  insertProfile.run(hospitalId, "OT Manager", "Full access to OT department only", 0);
  insertProfile.run(hospitalId, "ICU Manager", "Full access to ICU department only", 0);
  insertProfile.run(hospitalId, "Finance Viewer", "Read-only access to all dashboards and outputs, no masters", 0);
  insertProfile.run(hospitalId, "Data Entry Clerk", "Can edit master/input data for assigned departments, cannot view dashboard", 0);

  const profiles = Object.fromEntries(
    db.prepare("SELECT id, name FROM profiles WHERE hospital_id = ?").all(hospitalId).map((r) => [r.name, r.id])
  );
  const allModules = db.prepare("SELECT id, code, department_id, module_type FROM modules").all();

  const setPerm = db.prepare(
    `INSERT OR REPLACE INTO profile_module_permissions (profile_id, module_id, can_view, can_edit) VALUES (?,?,?,?)`
  );

  // Admin: view+edit everything
  for (const m of allModules) setPerm.run(profiles["Admin"], m.id, 1, 1);

  // OT Manager: full access to OT modules + system dashboard view
  const otDeptId = deptIdByName["OT"];
  for (const m of allModules) {
    if (m.department_id === otDeptId) setPerm.run(profiles["OT Manager"], m.id, 1, 1);
    if (m.code === "SYS_GLOBAL_DASHBOARD") setPerm.run(profiles["OT Manager"], m.id, 1, 0);
  }

  // ICU Manager: full access to ICU modules + system dashboard view
  const icuDeptId = deptIdByName["ICU"];
  for (const m of allModules) {
    if (m.department_id === icuDeptId) setPerm.run(profiles["ICU Manager"], m.id, 1, 1);
    if (m.code === "SYS_GLOBAL_DASHBOARD") setPerm.run(profiles["ICU Manager"], m.id, 1, 0);
  }

  // Finance Viewer: view-only on every OUTPUT/DASHBOARD + global dashboard
  for (const m of allModules) {
    if (m.module_type === "OUTPUT" || m.module_type === "DASHBOARD") setPerm.run(profiles["Finance Viewer"], m.id, 1, 0);
    if (m.code === "SYS_GLOBAL_DASHBOARD") setPerm.run(profiles["Finance Viewer"], m.id, 1, 0);
  }

  // Data Entry Clerk: view+edit MASTER/INPUT for OT & ICU only, no dashboards
  for (const m of allModules) {
    if ((m.department_id === otDeptId || m.department_id === icuDeptId) &&
        (m.module_type === "MASTER" || m.module_type === "INPUT")) {
      setPerm.run(profiles["Data Entry Clerk"], m.id, 1, 1);
    }
  }

  // ---- Users ----
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (hospital_id, username, password_hash, full_name, profile_id, department_id) VALUES (?,?,?,?,?,?)`
  );
  const pw = bcrypt.hashSync("password123", 8);
  insertUser.run(hospitalId, "admin", pw, "System Administrator", profiles["Admin"], null);
  insertUser.run(hospitalId, "ot.manager", pw, "OT Department Head", profiles["OT Manager"], otDeptId);
  insertUser.run(hospitalId, "icu.manager", pw, "ICU Department Head", profiles["ICU Manager"], icuDeptId);
  insertUser.run(hospitalId, "finance.viewer", pw, "Finance Analyst", profiles["Finance Viewer"], null);
  insertUser.run(hospitalId, "data.clerk", pw, "Data Entry Clerk", profiles["Data Entry Clerk"], otDeptId);

  // ---- Cost heads ----
  const insertCH = db.prepare(`INSERT OR IGNORE INTO cost_heads (code,name,display_order) VALUES (?,?,?)`);
  [["MP","Manpower",1],["MT","Material",2],["MC","Machinery",3],["EX","Expenses",4],["UT","Utilities",5]]
    .forEach(([c,n,o]) => insertCH.run(c,n,o));

  // ---- Rate & tariff master ----
  const insertRate = db.prepare(`INSERT OR IGNORE INTO rate_tariff_master (hospital_id, param_code, param_name, value, applies_to) VALUES (?,?,?,?,?)`);
  const rates = [
    ["STD_DAYS_YEAR","Standard working days per year",300,"Equipment/AC/Furniture depreciation"],
    ["STD_DAYS_MONTH","Standard days per month",22,"Manpower/Building"],
    ["SCRAP_PCT","Scrap value %",5,"All depreciable assets"],
    ["EQUIP_INSURANCE_PCT","Equipment insurance %",1,"Equipment master"],
    ["EQUIP_MAINT_PCT","Equipment maintenance %",10,"Equipment master"],
    ["AC_INSURANCE_PCT","AC insurance %",1,"AC master"],
    ["AC_MAINT_PCT","AC maintenance %",5,"AC master"],
    ["ELEC_RATE_GENERAL","Electricity tariff - general (Rs/unit)",10.5,"Power master"],
    ["ELEC_RATE_AC","Electricity tariff - AC (Rs/unit)",10.45,"AC master"],
    ["KW_PER_TON","kW per Ton conversion factor",1.2,"AC power load"],
    ["BUILDING_LIFE_YEARS","Building asset life (years)",30,"Building master"],
    ["DEFAULT_BEDS","Default no. of beds for per-bed apportionment",351,"Simple asset master"],
  ];
  rates.forEach((r) => insertRate.run(hospitalId, ...r));

  // ---- Rate Type Master ----
  const insertRateType = db.prepare(`INSERT OR IGNORE INTO rate_type_master (hospital_id, code, name, description) VALUES (?,?,?,?)`);
  insertRateType.run(hospitalId, "FEE_PER_SURGERY", "Fee per surgery", "A flat professional fee already scoped to one case (e.g. Surgeon, Anaesthetist fees) — not apportioned further, but is multiplied by No. of Persons if more than one.");
  insertRateType.run(hospitalId, "SALARY_PER_MONTH", "Salary per month", "A monthly salary that gets apportioned to one case via the department's standard days/hours and Input driver (surgery hours or length of stay).");

  // ---- Allocation basis master ----
  const basisRows = loadJSON("basis_allocation.json").slice(1);
  const insertBasis = db.prepare(`INSERT INTO allocation_basis_master (hospital_id, classification, department_name, cost_component, basis_of_allocation) VALUES (?,?,?,?,?)`);
  let curClass = null, curDept = null;
  for (const [cls, dept, comp, basis] of basisRows) {
    if (cls) curClass = cls;
    if (dept) curDept = dept;
    if (!comp) continue;
    insertBasis.run(hospitalId, curClass, curDept, comp, basis);
  }

  // ---- Procedure-level default duration/length-of-stay (entered once per procedure) ----
  db.prepare(`INSERT OR IGNORE INTO procedure_default_driver (procedure_id, default_hours, default_days, notes) VALUES (?,?,?,?)`)
    .run(cabgProcId, 6, 7, "CABG's standard surgery duration (6 hrs) and post-op length of stay (7 days) — every department inherits whichever applies to its own driver type, unless overridden individually.");

  // ---- Department input (driver defaults) — CABG procedure ----
  const insertInput = db.prepare(
    `INSERT OR IGNORE INTO department_input (department_id, procedure_id, driver_hours, driver_days, standard_working_days_year, standard_days_month, standard_hours_day, no_of_beds)
     VALUES (?,?,NULL,NULL,?,?,?,?)`
  );
  const stdHoursByDept = {
    OT: 7, ICU: 24, LAB: 8, RADIOLOGY: 8, PHYSIOTHERAPHY: 8, "BLOOD BANK": 8, PHARMACY: 8, WARD: 24, CSSD: 8,
  };
  for (const [code, name, classification, engine, driver, order] of DEPARTMENTS) {
    const deptId = deptIdByName[name];
    const stdHours = stdHoursByDept[code] || 8;
    insertInput.run(deptId, cabgProcId, null, null, stdHours, null);
  }

  // ---- Full-template master data (manpower/materials/equipment/nonmedical/ac/power) ----
  const raw = loadJSON("master_data_raw.json");

  function deptId(label) {
    const mapped = DEPT_NAME_MAP[label] || label;
    return deptIdByName[mapped] || null;
  }
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  function get(row, keys) {
    for (const k of keys) {
      for (const hk of Object.keys(row)) {
        if (hk.trim().toLowerCase() === k.toLowerCase()) return row[hk];
      }
    }
    return null;
  }

  const isAggregateLabel = (s) => /^(total|sub\s*total|grand\s*total)\b/i.test(String(s || "").trim());

  const insMP = db.prepare(`INSERT INTO manpower_master (department_id, procedure_id, sl_no, role, category, no_of_persons, rate_type, rate_value) VALUES (?,?,?,?,?,?,?,?)`);
  const insMT = db.prepare(`INSERT INTO materials_master (department_id, procedure_id, sl_no, item_name, cost_price_per_unit, qty_per_patient) VALUES (?,?,?,?,?,?)`);
  const insEQ = db.prepare(`INSERT INTO equipment_master (department_id, procedure_id, sl_no, equipment_name, cost_price, date_of_purchase, useful_life_years, no_of_units, scrap_pct, insurance_pct, maintenance_pct) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insNM = db.prepare(`INSERT INTO nonmedical_asset_master (department_id, procedure_id, sl_no, asset_name, no_of_units, cost_price, useful_life_years, scrap_pct) VALUES (?,?,?,?,?,?,?,?)`);
  const insAC = db.prepare(`INSERT INTO ac_master (department_id, procedure_id, sl_no, floor, room, odu_capacity_tr, capital_cost, useful_life_years, scrap_pct, insurance_pct, maintenance_pct) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const insPW = db.prepare(`INSERT INTO power_master (department_id, procedure_id, sl_no, equipment_name, power_kw) VALUES (?,?,?,?,?)`);

  for (const block of raw.manpower) {
    const did = deptId(block.department);
    if (!did) continue;
    const isFee = /experts|fee|other employees/i.test(block.sub_block || "");
    for (const row of block.rows) {
      const slNo = num(get(row, ["Sl. No"]));
      const role = get(row, ["Particulars", "Designation"]);
      if (!role || typeof role !== "string" || isAggregateLabel(role)) continue;
      const rate = num(get(row, ["CABG on-pump", "Gross Salary per staff/month", "Cost price (Rs. )"]));
      if (rate === null) continue;
      insMP.run(did, cabgProcId, slNo, role, get(row, ["Category"]) || null, num(get(row, ["No of persons"])) || 1,
        isFee ? "FEE_PER_SURGERY" : "SALARY_PER_MONTH", rate);
    }
  }

  for (const block of raw.materials) {
    const did = deptId(block.department);
    if (!did) continue;
    for (const row of block.rows) {
      const name = get(row, ["Name of the material", "Particulars"]);
      const price = num(get(row, ["Cost price per unit  (in Rs. )", "Cost price per unit (in Rs. )"]));
      const qty = num(get(row, ["Qty per Patient", "Qty"]));
      if (!name || typeof name !== "string" || price === null || isAggregateLabel(name)) continue;
      insMT.run(did, cabgProcId, num(get(row, ["Sl. No"])), name, price, qty || 1);
    }
  }

  for (const block of raw.equipment) {
    const did = deptId(block.department);
    if (!did) continue;
    for (const row of block.rows) {
      const name = get(row, ["Name of the equipment"]);
      const cost = num(get(row, ["Cost price (Rs. )"]));
      if (!name || typeof name !== "string" || cost === null || isAggregateLabel(name)) continue;
      insEQ.run(did, cabgProcId, num(get(row, ["Sl. No"])), name, cost,
        String(get(row, ["Date of Purchase"]) || ""),
        num(get(row, ["Average life-time of the equipment- (in Yrs)", "Average life-time of the equipment"])) || 7,
        num(get(row, ["No. of Equipment"])) || 1, 5, 1, 10);
    }
  }

  for (const block of raw.nonmedical) {
    const did = deptId(block.department);
    if (!did) continue;
    for (const row of block.rows) {
      const name = get(row, ["Name of the equipment / Furniture"]);
      const cost = num(get(row, ["Cost price (Rs. )"]));
      if (!name || typeof name !== "string" || cost === null || isAggregateLabel(name)) continue;
      insNM.run(did, cabgProcId, num(get(row, ["Sl. No"])), name, num(get(row, ["No. of Equipment"])) || 1, cost,
        num(get(row, ["Average life-time of the equipment"])) || 7, 5);
    }
  }

  for (const block of raw.ac) {
    const did = deptId(block.department);
    if (!did) continue;
    for (const row of block.rows) {
      const cost = num(get(row, ["CAPITAL COST"]));
      if (cost === null) continue;
      insAC.run(did, cabgProcId, num(get(row, ["Sl. No"])), String(get(row, ["Floor"]) || ""), String(get(row, ["Area"]) || ""),
        num(get(row, [" ODU details-TR"])) || 0, cost, num(get(row, ["Average life-time of the equipment"])) || 7, 5, 1, 5);
    }
  }

  for (const block of raw.power) {
    const did = deptId(block.department);
    if (!did) continue;
    for (const row of block.rows) {
      const name = get(row, ["Name of the equipment"]);
      const kw = num(get(row, ["Power consumption units per hour (in KV)"]));
      if (!name || typeof name !== "string" || kw === null) continue;
      insPW.run(did, cabgProcId, num(get(row, ["Sl. No"])), name, kw);
    }
  }

  // ---- Building master ----
  const buildingRows = loadJSON("building_master.json");
  const insBld = db.prepare(`INSERT OR REPLACE INTO building_master (department_id, procedure_id, area_sqft, cost_per_sqft, dept_building_value, life_years) VALUES (?,?,?,?,?,?)`);
  function bget(fields, keys) {
    for (const k of keys) for (const hk of Object.keys(fields)) if (hk.trim().toLowerCase() === k.toLowerCase()) return fields[hk];
    return null;
  }
  for (const b of buildingRows) {
    const did = deptId(b.department);
    if (!did) continue;
    const area = num(bget(b.fields, ["Area for OT", "Total area to specific dept", "Specific areas", "Area square feet"]));
    const rate = num(bget(b.fields, ["Cost per square feet (in Rs. )"]));
    const value = num(bget(b.fields, ["Total OT Building Cost", "Cost of OT", "Cost of building for IT (in Rs. )"]));
    const life = num(bget(b.fields, ["Life of the asset (in years)"])) || 30;
    if (area === null && value === null) continue;
    insBld.run(did, cabgProcId, area || 0, rate || 0, value || 0, life);
  }

  // ---- Simple asset master (Genset, UPS, Solar, Water, Biometric, Biomedical waste, Dietics) ----
  const simpleRows = loadJSON("simple_master.json");
  const insSimple = db.prepare(`INSERT INTO simple_asset_master (department_id, procedure_id, item_name, cost_price, useful_life_years, amc_pct, rate_per_bed_per_day, notes) VALUES (?,?,?,?,?,?,?,?)`);
  const simpleDeptMap = {
    "Genset Power Back Up": "GENSET POWER BACK UP", "UPS": "UPS", "Solar Heating": "SOLAR HEATING",
    "Water Facilitization": "WATER FACILITIES", "Biometric": "BIO METRIC",
    "Biomedical Waste (Outsourced)": "BIOMEDICAL WASTE (OUT SOURCED)", "Dietics": "DIETICS",
  };
  for (const row of simpleRows) {
    const mapped = simpleDeptMap[row.Department];
    const did = mapped ? deptIdByName[mapped] : null;
    if (!did) continue;
    const val = typeof row.Value === "number" ? row.Value : null;
    insSimple.run(did, cabgProcId, row["Item / Parameter"], val, null, null, null, row["Unit / Notes"] || null);
  }
  // Laundry linen items -> simple_asset_master under LAUNDRY
  const linenRows = loadJSON("linen_master.json");
  const laundryId = deptIdByName["LAUNDRY & LINEN"];
  for (const row of linenRows) {
    if (row.Value == null) continue;
    insSimple.run(laundryId, cabgProcId, `${row.Section || ""}: ${row.Particulars}`, row.Value, null, null, null, `Qty ${row.Qty} @ Rs.${row.Rate}`);
  }

  // ==========================================================================
  // NEW SPECIALTIES: Cardiology, Neurosurgery, Urology (from procedure-level
  // cost sheets — ground-truth totals go in procedure_department_reference,
  // supporting master-data detail is stored for reference/editing)
  // ==========================================================================
  seedNewSpecialties(hospitalId, deptIdByName, specialtyIdByCode, deptIdByCode);
  seedLabRadiology(hospitalId);

  // ---- Renumber Sl. No sequentially within each (department, procedure) group.
  // The CABG data was originally seeded straight from the source Excel's own row numbers,
  // which came from separate sub-tables (e.g. OT Manpower's "Experts" and "Employees"
  // sections each independently numbered from 1) — never renumbered into one sequence,
  // unlike every row created through the app's own auto-numbering since. ----
  function renumberSlNo(table) {
    const groups = db.prepare(`SELECT DISTINCT department_id, procedure_id FROM ${table}`).all();
    const reNum = db.transaction(() => {
      for (const g of groups) {
        const rows = db.prepare(`SELECT id FROM ${table} WHERE department_id = ? AND procedure_id = ? ORDER BY sl_no, id`).all(g.department_id, g.procedure_id);
        rows.forEach((r, i) => db.prepare(`UPDATE ${table} SET sl_no = ? WHERE id = ?`).run(i + 1, r.id));
      }
    });
    reNum();
  }
  ["manpower_master", "materials_master", "equipment_master", "nonmedical_asset_master", "ac_master", "power_master"].forEach(renumberSlNo);
  // test_master (Lab/Radiology) isn't procedure-scoped, and each sub-department (e.g.
  // Biochemistry, Haematology) restarts its own Sl. No sequence — renumber by
  // (department, sub_department) rather than department alone.
  const testGroups = db.prepare("SELECT DISTINCT department_id, sub_department FROM test_master").all();
  const reNumTest = db.transaction(() => {
    for (const g of testGroups) {
      const rows = db.prepare("SELECT id FROM test_master WHERE department_id = ? AND sub_department IS ? ORDER BY sl_no, id").all(g.department_id, g.sub_department);
      rows.forEach((r, i) => db.prepare("UPDATE test_master SET sl_no = ? WHERE id = ?").run(i + 1, r.id));
    }
  });
  reNumTest();

  console.log("Seed complete.");
  console.log("Departments:", db.prepare("SELECT COUNT(*) c FROM departments").get().c);
  console.log("Modules:", db.prepare("SELECT COUNT(*) c FROM modules").get().c);
  console.log("Manpower rows:", db.prepare("SELECT COUNT(*) c FROM manpower_master").get().c);
  console.log("Materials rows:", db.prepare("SELECT COUNT(*) c FROM materials_master").get().c);
  console.log("Equipment rows:", db.prepare("SELECT COUNT(*) c FROM equipment_master").get().c);
  console.log("NonMedical rows:", db.prepare("SELECT COUNT(*) c FROM nonmedical_asset_master").get().c);
  console.log("AC rows:", db.prepare("SELECT COUNT(*) c FROM ac_master").get().c);
  console.log("Power rows:", db.prepare("SELECT COUNT(*) c FROM power_master").get().c);
  console.log("Building rows:", db.prepare("SELECT COUNT(*) c FROM building_master").get().c);
  console.log("Simple asset rows:", db.prepare("SELECT COUNT(*) c FROM simple_asset_master").get().c);
  console.log("Allocation basis rows:", db.prepare("SELECT COUNT(*) c FROM allocation_basis_master").get().c);
}

module.exports = { run, seedLabRadiologyOverhead };

if (require.main === module) {
  run();
}
