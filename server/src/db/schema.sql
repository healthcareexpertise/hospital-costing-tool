-- ============================================================
-- CABG / Multi-specialty Hospital Costing Tool — Database Schema
-- ============================================================

-- ---------- Security: profiles, users, modules, permissions ----------

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system INTEGER DEFAULT 0   -- 1 = Admin profile, cannot be deleted
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  department_id INTEGER REFERENCES departments(id),  -- home department (nullable for admin/finance)
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  classification TEXT NOT NULL,       -- Medical Support / Service / Other Costs
  engine_type TEXT NOT NULL DEFAULT 'FULL',  -- FULL | SIMPLE
  driver_type TEXT NOT NULL DEFAULT 'HOURS', -- HOURS | DAYS  (allocation basis driver)
  display_order INTEGER
);

-- Modules: 4 auto per department (MASTER/INPUT/OUTPUT/DASHBOARD) + SYSTEM modules
CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,          -- e.g. OT_MASTER, OT_INPUT, OT_OUTPUT, OT_DASHBOARD, SYS_PROFILE_MASTER
  name TEXT NOT NULL,
  module_type TEXT NOT NULL,          -- MASTER | INPUT | OUTPUT | DASHBOARD | SYSTEM
  department_id INTEGER REFERENCES departments(id) -- null for SYSTEM modules
);

CREATE TABLE IF NOT EXISTS profile_module_permissions (
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  module_id INTEGER NOT NULL REFERENCES modules(id),
  can_view INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  PRIMARY KEY (profile_id, module_id)
);

-- ---------- Reference masters ----------

CREATE TABLE IF NOT EXISTS cost_heads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER
);

CREATE TABLE IF NOT EXISTS rate_tariff_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  param_code TEXT UNIQUE NOT NULL,
  param_name TEXT NOT NULL,
  value REAL NOT NULL,
  applies_to TEXT
);

CREATE TABLE IF NOT EXISTS rate_type_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- ---------- Lab & Radiology: per-test costing (a fundamentally different model from
-- the procedure-package costing above — each test/scan is individually priced using
-- its own direct cost + doctor's fee, plus a shared department-level overhead computed
-- two ways: against real "actual" test volume and against each machine's rated
-- "standard" capacity). Deliberately NOT scoped to a procedure_id — these tests are
-- billable independent of any surgical procedure. ----------

CREATE TABLE IF NOT EXISTS test_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  sl_no INTEGER,
  test_name TEXT NOT NULL,
  direct_cost REAL DEFAULT 0,
  doctor_fee REAL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS test_overhead_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id) UNIQUE,
  manpower_actual REAL DEFAULT 0, manpower_standard REAL DEFAULT 0,
  equipment_actual REAL DEFAULT 0, equipment_standard REAL DEFAULT 0,
  building_actual REAL DEFAULT 0, building_standard REAL DEFAULT 0,
  power_actual REAL DEFAULT 0, power_standard REAL DEFAULT 0,
  common_consumables_actual REAL DEFAULT 0, common_consumables_standard REAL DEFAULT 0,
  actual_volume REAL, standard_volume REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS employee_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT,
  department_id INTEGER REFERENCES departments(id),
  contact TEXT,
  monthly_salary REAL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS allocation_basis_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification TEXT,
  department_name TEXT,
  cost_component TEXT,
  basis_of_allocation TEXT
);

-- ---------- Specialties & Procedures ----------

CREATE TABLE IF NOT EXISTS specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER
);

CREATE TABLE IF NOT EXISTS procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  specialty_id INTEGER NOT NULL REFERENCES specialties(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Ground-truth per-procedure department costs, sourced directly from the hospital's own
-- procedure-level cost sheets where available (all specialties except CTVS/CABG, which
-- instead uses the live formula engine over its master data — see costEngine.js).
CREATE TABLE IF NOT EXISTS procedure_department_reference (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  manpower REAL DEFAULT 0,
  material REAL DEFAULT 0,
  machinery REAL DEFAULT 0,
  expenses REAL DEFAULT 0,
  utilities REAL DEFAULT 0,
  total REAL DEFAULT 0,
  UNIQUE(procedure_id, department_id)
);



CREATE TABLE IF NOT EXISTS manpower_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  role TEXT NOT NULL,
  category TEXT,
  no_of_persons REAL DEFAULT 1,
  rate_type TEXT NOT NULL DEFAULT 'SALARY', -- FEE_PER_SURGERY | SALARY_PER_MONTH (see rate_type_master)
  rate_value REAL NOT NULL DEFAULT 0,
  employee_id INTEGER REFERENCES employee_master(id)
);

CREATE TABLE IF NOT EXISTS materials_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  item_name TEXT NOT NULL,
  cost_price_per_unit REAL DEFAULT 0,
  qty_per_patient REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS equipment_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  equipment_name TEXT NOT NULL,
  cost_price REAL DEFAULT 0,
  date_of_purchase TEXT,
  useful_life_years REAL DEFAULT 7,
  no_of_units REAL DEFAULT 1,
  scrap_pct REAL DEFAULT 5,
  insurance_pct REAL DEFAULT 1,
  maintenance_pct REAL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS nonmedical_asset_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  asset_name TEXT NOT NULL,
  no_of_units REAL DEFAULT 1,
  cost_price REAL DEFAULT 0,
  useful_life_years REAL DEFAULT 7,
  scrap_pct REAL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS ac_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  floor TEXT,
  room TEXT,
  odu_capacity_tr REAL DEFAULT 0,
  capital_cost REAL DEFAULT 0,
  useful_life_years REAL DEFAULT 7,
  scrap_pct REAL DEFAULT 5,
  insurance_pct REAL DEFAULT 1,
  maintenance_pct REAL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS building_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  area_sqft REAL DEFAULT 0,
  cost_per_sqft REAL DEFAULT 0,
  dept_building_value REAL DEFAULT 0,
  life_years REAL DEFAULT 30,
  UNIQUE(procedure_id, department_id)
);

CREATE TABLE IF NOT EXISTS power_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  sl_no INTEGER,
  equipment_name TEXT NOT NULL,
  power_kw REAL DEFAULT 0
);

-- Simple (single-block) departments: Genset, UPS, Solar, Water, Biometric, Biomedical waste, Dietics, Laundry
CREATE TABLE IF NOT EXISTS simple_asset_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  item_name TEXT NOT NULL,
  cost_price REAL DEFAULT 0,
  useful_life_years REAL,
  amc_pct REAL,
  rate_per_bed_per_day REAL,
  notes TEXT
);

-- ---------- Department "Input" data: volume / driver values for one costing run ----------

CREATE TABLE IF NOT EXISTS department_input (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  procedure_id INTEGER NOT NULL REFERENCES procedures(id),
  driver_hours REAL,          -- e.g. surgery duration in hours (OT, AC/Building hourly depts)
  driver_days REAL,           -- e.g. length of stay in days (Ward, ICU, per-bed depts)
  standard_working_days_year REAL DEFAULT 300,
  standard_days_month REAL DEFAULT 22,
  standard_hours_day REAL DEFAULT 8,
  no_of_beds REAL DEFAULT 351,
  UNIQUE(procedure_id, department_id)
);
