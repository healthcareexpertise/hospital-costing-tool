# Multi-Specialty Hospital Costing Tool

A full-stack web application for procedure costing across multiple medical specialties,
built from Baby Memorial Hospital's costing workbooks. It generalizes those workbooks'
Master → Input → Output → Dashboard pattern into a proper multi-user application with
role-based module permissions, spanning **4 specialties and 23 procedures**:

- **CTVS**: CABG (On-Pump) — the original build, computed live from a formula engine
- **Cardiology**: Angioplasty, Coronary Angiogram, Device Closure, ECHO, Permanent
  Pacemaker Implantation, TMT
- **Neurosurgery**: Burr Hole Evacuation of SDH, Cranioplasty, Craniotomy (Trauma),
  Craniotomy (Tumours), Decompression Craniectomy + Duroplasty, VP Shunt
- **Urology**: AV Fistula, Lap. Nephrectomy (Partial & Radical), Orchidectomy, P.C.N,
  P.C.N.L, Renal Transplantation (donor & recipient), TURBT, URS

## Architecture

```
client/   React + Vite frontend (SPA)
server/   Node.js + Express REST API, SQLite database (built-in node:sqlite)
```

- **Auth**: JWT-based login. Passwords hashed with bcrypt.
- **Data model**: Specialty → Procedure → Department. A **Department** (OT, ICU, Ward,
  Pharmacy, ...) is a hospital cost centre shared across every procedure; a **Procedure**
  (CABG, Angioplasty, VP Shunt, URS, ...) is a billable package that draws on some subset
  of departments. Every master-data row and Input record is scoped to one
  (procedure, department) pair.
- **RBAC**: Every screen is a "module" (e.g. `OT_MASTER`, `OT_OUTPUT`,
  `SYS_PROFILE_MASTER`). Modules are scoped by **department**, not by procedure — an OT
  Manager can manage OT data across every procedure, switching between them with the
  procedure selector in the top bar, rather than needing separate permissions per
  procedure. The **Profile Master** screen lets an admin assign each profile view/edit
  access to each module. Every API route checks this permission table server-side.
- **Modules per department**: Master (rate-card / asset registers), Input (volume/driver
  values — surgery hours, length of stay), Output (computed 5-cost-head breakdown for the
  selected procedure), Dashboard (charts). Admin has view+edit on all of them.
- **Costing engine** (`server/src/engine/costEngine.js`) has two sources of truth per
  (procedure, department):
  1. **Computed** — CABG only. Recomputes Manpower / Material / Machinery / Expenses /
     Utilities live from Master rows and Input parameters; editing either immediately
     changes the Output.
  2. **Reference** — the 22 Cardiology/Neurosurgery/Urology procedures. These come with
     their own validated procedure-level cost sheets from the hospital, so rather than
     risk drift from re-deriving formulas, the Output for these is read directly from
     that ground truth (`procedure_department_reference` table). Master-data rows are
     still populated and editable for reference, but don't yet feed back into the total
     for these procedures — see Known Limitations.
- **Procedure selector**: a specialty-grouped dropdown in the top bar (persisted in
  `localStorage`) that every Master/Input/Output/Dashboard screen reads from.
- **Global Dashboard**: now a hospital-wide view across all 23 procedures — cost share by
  specialty, top procedures by package cost, and a full sortable/filterable table.

## Data

The database is seeded (`server/src/db/seed.js`) from data extracted out of the
hospital's source workbooks:
- CABG: the original 37-file costing model (see `CABG_Masters_Workbook.xlsx` for the
  standalone reference version of this same data).
- The 22 new procedures: extracted from `Cardiology.rar`, `Neurosurgery.rar`, `URO.rar`
  (each procedure's own department-level cost files, plus its procedure-level top sheet
  used as the reference total).

## Running it

Requires **Node.js 22.5+** (for the built-in `node:sqlite` module — no native compile
step needed, so a plain `npm install` should always work without build tools).

```bash
# 1. Backend
cd server
npm install
npm run seed     # creates & populates server/src/db/costing.db (delete the .db file first to re-run cleanly)
npm start        # http://localhost:4000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev       # http://localhost:5173  (dev server proxies /api to :4000)
# or: npm run build && npm run preview   for a production build
```

Open http://localhost:5173 and sign in.

### Demo accounts (password: `password123` for all)

| Username         | Profile         | Scope                                                       |
|------------------|-----------------|---------------------------------------------------------------|
| `admin`          | Admin           | View + edit every module, every procedure                    |
| `ot.manager`     | OT Manager      | Full access to OT only (any procedure), + view of Global Dashboard |
| `icu.manager`    | ICU Manager     | Full access to ICU only (any procedure), + view of Global Dashboard |
| `finance.viewer` | Finance Viewer  | View-only on every department's Output + Dashboard, no Master |
| `data.clerk`     | Data Entry Clerk| Edit Master + Input for OT & ICU only, no dashboards            |

Use the **Profile Master** screen (as `admin`) to change any of this.

## Module map

Each of the 35 departments gets 4 modules; system-level modules sit alongside them:
`SYS_GLOBAL_DASHBOARD`, `SYS_DEPARTMENT_MASTER`, `SYS_PROFILE_MASTER`, `SYS_USER_MASTER`,
`SYS_RATE_TARIFF_MASTER`, `SYS_ALLOCATION_BASIS_MASTER`.

## Known limitations / next steps

- **Common inputs are now hospital-wide, not per-department.** Standard working days/year,
  standard days/month, and default bed count live once in each hospital's Rate & Tariff
  Master and are inherited by every department's Input screen unless explicitly
  overridden — edit the hospital-wide value once and every department/procedure using
  the default picks it up immediately (verified: changing STD_DAYS_YEAR moved OT's
  machinery cost live, with no change needed on OT's own Input record).
- **Lab/Radiology overhead is now fully live-computed**, not a precomputed constant.
  Each department's Master screen stores an *annual total* per cost component
  (Manpower/Equipment/Building/Power/Common Consumables) plus *actual* and *standard*
  test volumes; the per-test rate is `annual total ÷ volume`, computed on every request —
  the same calculation the source Excel used. Verified: halving Biochemistry's actual
  volume exactly doubled its per-test overhead, then reverted cleanly. This is what makes
  the Lab/Radiology masters genuinely reusable for a different hospital with different
  patient volumes, rather than baking in Baby Memorial's own numbers permanently.
- **⚠️ Schema change — Lab/Radiology department structure**: Lab and Radiology went
  from 9 separate departments (`LAB_BIOCHEM`, `RAD_XRAY`, etc.) down to 2
  (`LABORATORY`, `RADIOLOGY`) with a `sub_department` field distinguishing Biochemistry
  from Haematology from X-Ray from CT, etc. If you're deploying this on top of an
  existing persistent-disk database that still has the old 9-department structure, the
  old department codes won't exist anymore — Profile Master permissions referencing the
  old per-sub-department modules will need re-granting against the new 2-department
  modules (Admin's own permissions repopulate automatically on next seed; other profiles
  that had OT-Manager-style scoped access to a specific old Lab sub-department will need
  their permissions reassigned to the new `LABORATORY`/`RADIOLOGY` modules in Profile
  Master).
- **⚠️ Schema change — Lab/Radiology overhead**: `test_overhead_master`'s columns
  changed shape (from precomputed `*_actual`/`*_standard` rates to `*_annual_total` +
  `actual_volume`/`standard_volume`). If you're deploying this on top of an existing
  persistent-disk database that already has the *old* Lab/Radiology overhead data, that
  old data won't match the new column names — you'll want to either let a fresh Lab/
  Radiology reseed happen (the seed script's test-row insert is guarded to only run once
  per hospital if `test_master` is already populated, but the *overhead* table is always
  safely re-computed) or manually clear the `test_overhead_master` table once before
  this deploy so it reseeds cleanly.
- Duplicate Sl.No values that existed in the original CABG data (seeded from source
  Excel's own row numbers across separate sub-tables) have been renumbered sequentially;
  this runs automatically as part of every seed.

- **New-specialty Output isn't yet wired to Master edits.** For the 22
  Cardiology/Neurosurgery/Urology procedures, Output reads the hospital's own validated
  reference total rather than recomputing from Master rows (see Architecture above). If
  you edit, say, an equipment cost on VP Shunt's OT Master screen, the Output total won't
  move yet — the reference figure is what's shown, with a note to that effect on the
  Output screen. Wiring these to the same live formula engine CABG uses is the natural
  next step, department-type by department-type.
- **CABG's Global Dashboard total is inflated** by a pre-existing equipment-apportionment
  issue for a few hospital-wide service departments (notably IT, whose ~Rs. 17.5L in shared
  computers/software gets apportioned by CABG's own driver rather than total hospital
  activity). OT/ICU/Ward-level CABG figures are accurate; it's specifically the
  all-department roll-up that's affected. Flagged in the Global Dashboard UI itself.
- **Costing engine fidelity (CABG only)**: Manpower and Material match the original
  spreadsheet almost to the rupee; Machinery/Utilities diverge for a few departments for
  the same apportionment-base reason above.
- **Seed coverage**: the master-data extraction for the new specialties uses fuzzy header
  matching across ~500 files with inconsistent column naming; spot-checked (including a
  pass to strip stray "TOTAL" subtotal rows) but not exhaustively verified row-by-row.
  Reference totals (used for Output) are the reliable ground truth regardless.
- **147-procedure master list**: this build covers the 23 procedures with detailed cost
  sheets in the files provided (CTVS/Cardiology/Neurosurgery/Urology). The hospital's full
  price list spans 147 procedures across 19 specialties (see `surgerylist.xlsx` in the
  `BMH_Hareesh` upload) — extending to the rest follows the same ingestion pattern used
  here (`server/src/db/seed.js` → `seedNewSpecialties()`), once the remaining specialties'
  source files are available.
- **Production hardening not included**: no HTTPS/reverse-proxy config, no refresh
  tokens, no audit trail, no pagination on large tables, no automated tests.
- **Cloud hosting**: live on Render as a single web service, now with a **persistent
  disk** so data survives redeploys (see below) — no longer local-only.

## Multi-tenancy (Hospital Profile Master)

The app now supports multiple hospitals on one deployment, each with **completely
isolated data** — departments, procedures, master data, users, profiles, everything.

- **Platform Admin** (`platform.admin` / `password123`) — not tied to any hospital. Signs
  in to a dedicated screen (Hospital Master) that lists every hospital on the platform
  and lets you onboard a new one: hospital record, a starter set of 11 departments (OT,
  ICU, Ward, Pharmacy, Lab, Radiology, HR, Finance, Housekeeping, Security, Maintenance),
  default Rate & Tariff / Rate Type masters, and that hospital's first Admin login — all
  created atomically in one transaction. Deliberately does **not** copy Baby Memorial's
  own CABG/Cardiology/Neurosurgery/Urology/Lab/Radiology data, since that's proprietary
  to them, not a generic template.
- **Hospital Admin** (e.g. Baby Memorial's `admin`) — sees only their own hospital's
  data. A **Hospital Profile** screen (Sidebar → Administration) lets them view/edit
  their own hospital's details (address, contact, bed count, etc.) — self-service, no
  platform admin involvement needed for that.
- **Isolation is enforced at the database layer**, not just hidden in the UI: every
  route that touches departments, procedures, specialties, profiles, users, or the
  Rate/Rate-Type/Allocation-Basis masters filters by the caller's own `hospital_id` from
  their JWT. Two hospitals can both use department code `OT` with zero collision (the
  uniqueness constraint is `(hospital_id, code)`, not global) — **verified directly**: a
  test hospital's admin got a 404 (not a 403 — the department genuinely doesn't exist in
  their scope) when trying to touch Baby Memorial's OT department by code.
- **What's *not* hospital-scoped, deliberately**: `cost_heads` (the fixed Manpower/
  Material/Machinery/Expenses/Utilities list — the same for everyone) and the deeper
  master tables (`manpower_master`, `equipment_master`, etc.) — those stay correctly
  isolated *transitively* through `department_id`/`procedure_id`, since every department
  and procedure now belongs to exactly one hospital. This kept the migration to a
  manageable set of tables instead of touching all twenty-odd of them directly.



## Lab & Radiology (per-test costing)

Lab and Radiology are costed fundamentally differently from every other department in
this app — not as a package for one procedure, but as **a price list of individual
tests/scans**, each with its own direct cost plus a shared sub-department overhead
computed two ways: against real recorded **"actual"** test volume, and against each
machine's rated **"standard"** capacity. This mirrors the methodology in the hospital's
own Lab and Radiology costing workbooks.

**Just 2 departments** — `LABORATORY` and `RADIOLOGY` — not 9. Each groups its tests by
a **`sub_department`** field (Biochemistry, Haematology, Clinical Pathology,
Microbiology, Blood Bank under Laboratory; X-Ray, CT, MRI, USG/Doppler under Radiology)
shown as tabs on the Master/Output/Dashboard screens, rather than as separate top-level
departments — keeping the sidebar and Profile Master permission list simple (one
Master/Input/Output/Dashboard permission per department, not nine) while the underlying
costing still tracks each sub-department's own overhead independently. **529 tests
total** (113 Lab + 13 Blood Bank + 403 Radiology).

**Data model** (`test_master`, `test_overhead_master`, `reagent_master`,
`test_equipment_master` in `schema.sql`) is deliberately *not* scoped to a procedure — a
blood test isn't tied to a specific surgery. For each test:
- **Direct cost** — the test's own reagent/consumable cost (Lab), or Radiology's
  already-fully-loaded technical cost per scan (see note below). Optionally linked to a
  **Reagent Master** row (kit cost ÷ tests per kit = cost per test, editable and
  auto-computed) and/or a **Test Equipment Master** row (which machine runs this test) —
  both are separate reference registers per sub-department, joined from the Tests tab.
- **Doctor fee** — physician/radiologist reading fee, directly attributable where the
  source data provides it (matched by test name).
- **Overhead** (Manpower, Equipment, Building, Power, Common Consumables) — stored as
  **annual totals + actual/standard test volume** per sub-department, with the per-test
  rate computed *live* as total ÷ volume (see below), rather than a baked-in constant.

Total cost per test = direct cost + doctor fee + (annual overhead total ÷ volume).

**How to use it**: each department's Master screen has sub-department tabs, and within
each tab: a Tests screen (editable, auto-numbered Sl.No, with Reagent/Equipment
dropdowns), a Reagent Master, an Equipment Master, and a Shared Overhead screen (annual
totals + actual/standard volume, with the computed per-test rate shown live). Output is
a searchable, sortable, sub-department-filterable price list. Dashboard shows overhead
composition and top-10 tests per sub-department.

**Proven live, not just built**: halving a sub-department's actual test volume on the
Overhead screen exactly doubles every test's overhead cost in that sub-department, and
reverting restores the original figure — verified directly, not just reasoned about.
This is what makes these masters genuinely reusable for a different hospital with
different patient volumes and reagent contracts, rather than baking in Baby Memorial's
own numbers permanently.

**Modeling notes / known simplifications** (documented here rather than silently
assumed):
- **Radiology's "direct cost"** is read directly from the source's own "Total cost per
  test" column, which appears to already include manpower/equipment/building/power
  overhead baked in (verified: X-ray's consumable-only cost and its "total cost per
  test" match exactly when the two are equal, and diverge substantially where they're
  not — consistent with additional overhead being folded into the higher figure). Only
  the doctor's fee is added on top, since that's tracked in a genuinely separate
  workbook with its own methodology (a % of the test's billing rate). No overhead row is
  populated for Radiology's sub-departments as a result.
- **Lab's doctor/pathologist fee** is applied as one lab-wide constant (from the one
  clean, directly-given figure in the source), rather than the department-specific
  cross-allocation the source data hints at (a `B01LD` working file shows doctor costs
  cross-charged between Biochemistry/Haematology/Clinical Pathology/Microbiology at
  different rates in a way that didn't resolve to a consistent, defensible formula in
  the time available). If per-sub-department precision matters here, this is the first
  place to revisit — `seedLabRadiologyOverhead()` in `seed.js` has the relevant working
  and a comment pointing at the source sheet.
- **Blood Bank's "standard" manpower/common-consumables figures** are estimated by
  scaling the "actual" figures using Blood Bank's own equipment actual/standard ratio,
  because the source only gives an "actual" value directly for those two components.
- Lab's Manpower and Power overhead are the same annual total and volume across every
  Lab sub-department (this is not a simplification — verified directly against the
  source, which computes them once for the whole Lab, not per sub-department);
  Equipment and Building overhead are specific to each sub-department, also matching
  the source.
- The **Reagent Master → Test Direct Cost link is informational, not auto-syncing**:
  editing a reagent's kit cost updates its own computed cost-per-test, but doesn't
  automatically push that new number into every linked test's `direct_cost` field yet —
  that's a reasonable next step if reagent price changes turn out to be frequent.



## Deploying to the cloud (Render, Starter plan + persistent disk)

The app is already configured to deploy as a **single web service** — `npm run build`
builds the React frontend and has Express serve it directly, so there's one URL, no
separate frontend/backend hosting to coordinate, and (after this one-time setup) no more
commands to run, ever. `render.yaml` also provisions a **persistent disk**, so your data
(Master edits, new users, new procedures, everything entered through the UI) survives
redeploys — it no longer resets to the seeded starting data every time you push a fix.

This requires Render's **Starter plan** (~$7/month for the web service) plus the disk
itself (~$0.25/month for 1GB, far more than a SQLite database needs) — persistent disks
aren't available on the free tier. You'll need a payment method on file in your Render
account.

1. **Put the code on GitHub** (Render deploys from a Git repo — this is the only way to
   avoid a command line entirely).
   - Go to github.com, sign in or create a free account.
   - Click **New repository**, give it a name (e.g. `hospital-costing-tool`), leave it
     Public or Private, click **Create repository**.
   - On the new repo's page, click **uploading an existing file**, then drag the
     `costingapp` folder's contents (everything inside it — `client/`, `server/`,
     `scripts/`, `package.json`, `render.yaml`, `README.md`, `.gitignore`) into the
     browser window. Commit the upload.
2. **Create a Render account** at render.com and add a payment method (Account Settings
   → Billing) — required for the Starter plan and disk.
3. Click **New > Blueprint**, connect your GitHub account, and select the repository you
   just created. Render reads `render.yaml` from the repo root and pre-fills everything —
   service name, plan, build command, start command, disk, and a securely auto-generated
   `JWT_SECRET`. Click **Apply**.
4. Wait for the build to finish (a few minutes — it runs `npm install` for both
   client and server, builds the React app, and starts the Node service). Render shows
   build logs live.
5. Once live, Render gives you a URL like `https://hospital-costing-tool.onrender.com`.
   Open it — the database seeds itself automatically on first boot (you'll see
   "Fresh database detected — running seed automatically..." in the logs, but only this
   first time), then the login screen loads. Sign in with the same demo accounts as
   local (`admin` / `password123`, etc.) — share the URL with anyone who needs access;
   no install step for them at all.

### How the persistent disk works

- The disk mounts at `/opt/render/project/data`, deliberately **not** inside
  `server/src/db/` — that folder holds `schema.sql` and `seed_data/*.json` from the repo
  itself, and mounting an (initially empty) disk directly over it would hide those files
  from the running app. Instead, `server/src/db/db.js` reads a `DATA_DIR` environment
  variable (set by `render.yaml`) to know where the actual database file lives, and falls
  back to its own folder for local development where `DATA_DIR` isn't set.
- On every deploy, the code changes (new features, bug fixes) but the mounted disk — and
  therefore the database file on it — is untouched, so your data persists across
  deploys. Only a fresh disk (e.g. if you delete and recreate the service) would trigger
  reseeding.
- Verified locally by starting the server against a directory, adding a test record,
  fully killing the process, and starting a brand new process pointed at the same
  directory — the record was still there and no reseed was triggered, which is exactly
  what happens on a Render redeploy.

### Other caveats

- **No sleep on Starter**: unlike the free tier, a Starter-plan service stays always-on —
  no more 15-minute-inactivity spin-down or cold-start delay.
- **JWT_SECRET**: `render.yaml` has Render auto-generate a random one on deploy, so

  sessions are properly secured (not using the `dev-secret-change-me` fallback from
  local development).



1. Add a row to `specialties`/`procedures` (via the seed script or the Procedure Master
   API routes in `procedure.routes.js`).
2. Populate `department_input` for each department the procedure uses.
3. Either populate `procedure_department_reference` with validated totals (if you have a
   source cost sheet, like the 22 procedures here), or rely on the live formula engine by
   populating Master rows only (like CABG) — the engine automatically prefers a reference
   row when one exists, and falls back to computing otherwise.
4. It shows up immediately in the procedure selector, Master/Input/Output/Dashboard, and
   the Global Dashboard — no per-procedure UI code needed.
