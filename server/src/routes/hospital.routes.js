const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { requirePlatformAdmin } = require("../middleware/rbac");

const router = express.Router();
router.use(requireAuth);

// Any authenticated (non-platform-admin) user can fetch their own hospital's profile for display
router.get("/me", (req, res) => {
  if (!req.user.hospital_id) return res.json(null);
  res.json(db.prepare("SELECT * FROM hospitals WHERE id = ?").get(req.user.hospital_id));
});

// A hospital's own Admin can update their own hospital's profile details (not create/delete)
router.put("/me", (req, res) => {
  if (!req.user.hospital_id) return res.status(400).json({ error: "Not associated with a hospital" });
  const { name, address, city, state, contact_person, phone, email, bed_count, established_year, logo_url } = req.body;
  db.prepare(
    `UPDATE hospitals SET name=?, address=?, city=?, state=?, contact_person=?, phone=?, email=?, bed_count=?, established_year=?, logo_url=? WHERE id=?`
  ).run(name, address, city, state, contact_person, phone, email, bed_count || null, established_year || null, logo_url || null, req.user.hospital_id);
  res.json({ ok: true });
});

// ---- Platform admin: manage all hospitals ----
router.get("/", requirePlatformAdmin, (req, res) => {
  const hospitals = db.prepare("SELECT * FROM hospitals ORDER BY id").all();
  const withCounts = hospitals.map((h) => ({
    ...h,
    user_count: db.prepare("SELECT COUNT(*) c FROM users WHERE hospital_id = ?").get(h.id).c,
    department_count: db.prepare("SELECT COUNT(*) c FROM departments WHERE hospital_id = ?").get(h.id).c,
  }));
  res.json(withCounts);
});

const DEFAULT_RATES = [
  ["STD_DAYS_YEAR", "Standard working days per year", 300, "Equipment/AC/Furniture depreciation"],
  ["STD_DAYS_MONTH", "Standard days per month", 22, "Manpower/Building"],
  ["SCRAP_PCT", "Scrap value %", 5, "All depreciable assets"],
  ["EQUIP_INSURANCE_PCT", "Equipment insurance %", 1, "Equipment master"],
  ["EQUIP_MAINT_PCT", "Equipment maintenance %", 10, "Equipment master"],
  ["AC_INSURANCE_PCT", "AC insurance %", 1, "AC master"],
  ["AC_MAINT_PCT", "AC maintenance %", 5, "AC master"],
  ["ELEC_RATE_GENERAL", "Electricity tariff - general (Rs/unit)", 10.5, "Power master"],
  ["ELEC_RATE_AC", "Electricity tariff - AC (Rs/unit)", 10.45, "AC master"],
  ["KW_PER_TON", "kW per Ton conversion factor", 1.2, "AC power load"],
  ["BUILDING_LIFE_YEARS", "Building asset life (years)", 30, "Building master"],
  ["DEFAULT_BEDS", "Default no. of beds for per-bed apportionment", 100, "Simple asset master"],
];
const DEFAULT_RATE_TYPES = [
  ["FEE_PER_SURGERY", "Fee per surgery", "A flat professional fee already scoped to one case, multiplied by No. of Persons if more than one."],
  ["SALARY_PER_MONTH", "Salary per month", "A monthly salary apportioned to one case via standard days/hours and the Input driver."],
];
const DEFAULT_DEPARTMENTS = [
  ["OT", "OT", "Medical Support", "FULL", "HOURS", 1], ["ICU", "ICU", "Medical Support", "FULL", "DAYS", 2],
  ["WARD", "WARD", "Medical Support", "FULL", "DAYS", 3], ["PHARMACY", "PHARMACY", "Medical Support", "FULL", "HOURS", 4],
  ["LAB", "LABORATORY", "Medical Support", "FULL", "HOURS", 5], ["RADIOLOGY", "RADIOLOGY", "Medical Support", "FULL", "HOURS", 6],
  ["HR", "HR", "Service", "FULL", "DAYS", 10], ["FINANCE", "FINANCE & ACCOUNTS", "Service", "FULL", "DAYS", 11],
  ["HOUSEKEEPING", "HOUSE KEEPING", "Service", "FULL", "DAYS", 12], ["SECURITY", "SECURITY", "Service", "FULL", "DAYS", 13],
  ["MAINTENANCE", "MAINTENANCE", "Service", "FULL", "DAYS", 14],
];

// Create a brand-new hospital: the hospital row, an Admin profile with full access to a
// starter department set, baseline Rate & Tariff / Rate Type defaults, and its first
// Admin user — deliberately NOT the CABG/Cardiology/Lab data extracted from Baby Memorial
// Hospital's own files, since that's proprietary to that hospital, not a generic template.
router.post("/", requirePlatformAdmin, (req, res) => {
  const { code, name, address, city, state, contact_person, phone, email, bed_count, admin_username, admin_password, admin_name } = req.body;
  if (!code || !name || !admin_username || !admin_password) {
    return res.status(400).json({ error: "code, name, admin_username and admin_password are required" });
  }
  try {
    const tx = db.transaction(() => {
      const hInfo = db.prepare(
        `INSERT INTO hospitals (code, address, city, state, contact_person, phone, email, bed_count, name) VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(code.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), address || null, city || null, state || null, contact_person || null, phone || null, email || null, bed_count || null, name);
      const hospitalId = hInfo.lastInsertRowid;

      const deptIds = {};
      const insertDept = db.prepare(`INSERT INTO departments (hospital_id, code, name, classification, engine_type, driver_type, display_order) VALUES (?,?,?,?,?,?,?)`);
      DEFAULT_DEPARTMENTS.forEach(([c, n, cls, eng, drv, ord]) => {
        const info = insertDept.run(hospitalId, c, n, cls, eng, drv, ord);
        deptIds[c] = info.lastInsertRowid;
      });

      const insertModule = db.prepare(`INSERT INTO modules (code, name, module_type, department_id) VALUES (?,?,?,?)`);
      const moduleIds = [];
      DEFAULT_DEPARTMENTS.forEach(([c, n]) => {
        [["MASTER", "Master"], ["INPUT", "Input"], ["OUTPUT", "Output"], ["DASHBOARD", "Dashboard"]].forEach(([type, label]) => {
          const code2 = `H${hospitalId}_${c}_${type}`;
          const info = insertModule.run(code2, `${n} - ${label}`, type, deptIds[c]);
          moduleIds.push(info.lastInsertRowid);
        });
      });
      const SYSTEM_MODULES = [
        ["SYS_GLOBAL_DASHBOARD", "Global Cost Dashboard"], ["SYS_DEPARTMENT_MASTER", "Department Master"],
        ["SYS_PROFILE_MASTER", "Profile Master"], ["SYS_USER_MASTER", "User Master"],
        ["SYS_RATE_TARIFF_MASTER", "Rate & Tariff Master"], ["SYS_ALLOCATION_BASIS_MASTER", "Allocation Basis Master"],
        ["SYS_SPECIALTY_MASTER", "Specialty Master"], ["SYS_PROCEDURE_MASTER", "Procedure (Surgery) Master"],
        ["SYS_EMPLOYEE_MASTER", "Employee Master"], ["SYS_RATE_TYPE_MASTER", "Rate Type Master"],
        ["SYS_HOSPITAL_PROFILE", "Hospital Profile"],
      ];
      SYSTEM_MODULES.forEach(([code2, name2]) => {
        const existing = db.prepare("SELECT id FROM modules WHERE code = ?").get(code2);
        moduleIds.push(existing ? existing.id : insertModule.run(code2, name2, "SYSTEM", null).lastInsertRowid);
      });

      const profInfo = db.prepare(`INSERT INTO profiles (hospital_id, name, description, is_system) VALUES (?,?,?,1)`)
        .run(hospitalId, "Admin", "Full access to every module for this hospital");
      const profileId = profInfo.lastInsertRowid;
      const setPerm = db.prepare(`INSERT INTO profile_module_permissions (profile_id, module_id, can_view, can_edit) VALUES (?,?,1,1)`);
      moduleIds.forEach((mid) => setPerm.run(profileId, mid));

      const insRate = db.prepare(`INSERT INTO rate_tariff_master (hospital_id, param_code, param_name, value, applies_to) VALUES (?,?,?,?,?)`);
      DEFAULT_RATES.forEach((r) => insRate.run(hospitalId, ...r));
      const insRateType = db.prepare(`INSERT INTO rate_type_master (hospital_id, code, name, description) VALUES (?,?,?,?)`);
      DEFAULT_RATE_TYPES.forEach((r) => insRateType.run(hospitalId, ...r));

      const insSpecialty = db.prepare(`INSERT INTO specialties (hospital_id, code, name, display_order) VALUES (?,?,?,1)`);
      const specInfo = insSpecialty.run(hospitalId, "GENERAL", "General");

      const hash = bcrypt.hashSync(admin_password, 8);
      db.prepare(`INSERT INTO users (hospital_id, username, password_hash, full_name, profile_id) VALUES (?,?,?,?,?)`)
        .run(hospitalId, admin_username, hash, admin_name || "Administrator", profileId);

      return hospitalId;
    });
    const hospitalId = tx();
    res.status(201).json({ id: hospitalId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", requirePlatformAdmin, (req, res) => {
  const { name, address, city, state, contact_person, phone, email, bed_count, established_year, logo_url, active } = req.body;
  db.prepare(
    `UPDATE hospitals SET name=?, address=?, city=?, state=?, contact_person=?, phone=?, email=?, bed_count=?, established_year=?, logo_url=?, active=? WHERE id=?`
  ).run(name, address, city, state, contact_person, phone, email, bed_count || null, established_year || null, logo_url || null, active === false ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
